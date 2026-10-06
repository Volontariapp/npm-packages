import type { ObjectLiteral } from '@volontariapp/database';
import { EventQueueModel, JobsOutboxModel } from '@volontariapp/database';
import { Logger } from '@volontariapp/logger';
import type { DataSource, EntityManager } from 'typeorm';
import { FileStatus } from '../enums/file-status.enum.js';
import { ScanStatus } from '../enums/scan-status.enum.js';
import { ValidationMode } from '../enums/validation-mode.enum.js';
import { FileModel } from '../models/file.model.js';
import {
  buildFileRejectedEvent,
  buildFileScannedEvent,
  buildScanFileJob,
} from './file-outbox.builders.js';
import type {
  CompleteScanInput,
  ConfirmUploadInput,
  ConfirmUploadResult,
  CreatePendingFileInput,
  RejectScanInput,
  ScanTransitionResult,
  ScanTransitionRow,
} from './file-repository.types.js';

/** Delay added to `upload_expires_at` when a failed synchronous processing is rolled back. */
export const RESET_UPLOAD_DELAY_MINUTES = 15;

type UpdateReturning<TRow> = [TRow[], number];

/*
 * The outbox rows are inserted with `manager.insert<ObjectLiteral>`: the typed form instantiates
 * `QueryDeepPartialEntity` over the generic outbox payloads and exceeds the TypeScript depth
 * limit. The entities built by `file-outbox.builders.ts` are already fully typed.
 */

/** Writes the result event of a terminal scan, inside the transaction of the transition. */
type ScanEventWriter = (manager: EntityManager, row: ScanTransitionRow) => Promise<void>;

/**
 * Persistence of the `files` table, shared by `ms-storage`, `worker-storage` and
 * `post-processor-storage`.
 *
 * Every transition is a single conditional `UPDATE ... RETURNING` run in a READ COMMITTED
 * transaction, without any prior read. A transition that matches no row returns `null` /
 * `false`: the caller decides what that means (replayed request, expired upload, released
 * file). The `jobs_outbox` / `event_queue` row of a transition is written in the same
 * transaction as the `UPDATE`.
 */
export class PostgresFileRepository {
  private readonly logger = new Logger({ context: PostgresFileRepository.name });

  constructor(private readonly dataSource: DataSource) {}

  /** Inserts a file waiting for its upload (`PENDING`, `AWAITING_UPLOAD`). */
  async createPending(input: CreatePendingFileInput): Promise<FileModel> {
    const repository = this.dataSource.getRepository(FileModel);
    // `insert`, never `save`: `save` would silently update a row that already has this id.
    await repository.insert({
      ...input,
      status: FileStatus.PENDING,
      scanStatus: ScanStatus.AWAITING_UPLOAD,
    });
    const saved = await repository.findOneByOrFail({ id: input.id });
    this.logger.log(`File ${saved.id} created, awaiting upload (${saved.validationMode})`);
    return saved;
  }

  /**
   * `AWAITING_UPLOAD` to `SCANNING`, counting one more attempt. Writes the `storage.scan_file`
   * job when the file is processed asynchronously. Returns `null` when no row matches (unknown
   * file, other owner, already confirmed, expired upload).
   */
  async confirmUpload(input: ConfirmUploadInput): Promise<ConfirmUploadResult | null> {
    const result = await this.runInTransaction('confirmUpload', input.fileId, async (manager) => {
      const [rows] = await manager.query<
        UpdateReturning<{ id: string; owner_id: string; validation_mode: ValidationMode }>
      >(
        `UPDATE files
         SET scan_status = $1, confirmed_at = now(), actual_size = $2,
             scan_attempts = scan_attempts + 1, updated_at = now()
         WHERE id = $3 AND owner_id = $4
           AND scan_status = $5
           AND upload_expires_at > now()
         RETURNING id, owner_id, validation_mode`,
        [
          ScanStatus.SCANNING,
          input.actualSize,
          input.fileId,
          input.ownerId,
          ScanStatus.AWAITING_UPLOAD,
        ],
      );
      const row = rows.at(0);
      if (!row) return null;

      if (row.validation_mode === ValidationMode.ASYNC) {
        await this.writeScanJob(manager, row.id, row.owner_id);
      }
      return { id: row.id, validationMode: row.validation_mode };
    });

    this.logTransition('confirmUpload', input.fileId, result !== null);
    return result;
  }

  /**
   * Technical failure of the synchronous pipeline for an `EntityType` that allows ASYNC:
   * `SYNC` to `ASYNC` while `SCANNING`, with the `storage.scan_file` job. Only a `SYNC` file
   * matches, so a replay never creates a second job. Returns whether the file was switched.
   */
  async switchToAsync(fileId: string): Promise<boolean> {
    const switched = await this.runInTransaction('switchToAsync', fileId, async (manager) => {
      const [rows] = await manager.query<UpdateReturning<{ id: string; owner_id: string }>>(
        `UPDATE files
         SET validation_mode = $1, updated_at = now()
         WHERE id = $2 AND scan_status = $3 AND validation_mode = $4
         RETURNING id, owner_id`,
        [ValidationMode.ASYNC, fileId, ScanStatus.SCANNING, ValidationMode.SYNC],
      );
      const row = rows.at(0);
      if (!row) return false;

      await this.writeScanJob(manager, row.id, row.owner_id);
      return true;
    });

    this.logTransition('switchToAsync', fileId, switched);
    return switched;
  }

  /**
   * Technical failure of the synchronous pipeline for avatar and badge: `SCANNING` back to
   * `AWAITING_UPLOAD`, upload deadline pushed back by 15 minutes (never shortened). Returns
   * whether the file was reset.
   */
  async resetToAwaitingUpload(fileId: string): Promise<boolean> {
    const [rows] = await this.dataSource.query<UpdateReturning<{ id: string }>>(
      `UPDATE files
       SET scan_status = $1,
           upload_expires_at = GREATEST(upload_expires_at, now() + make_interval(mins => $2)),
           updated_at = now()
       WHERE id = $3 AND scan_status = $4
       RETURNING id`,
      [ScanStatus.AWAITING_UPLOAD, RESET_UPLOAD_DELAY_MINUTES, fileId, ScanStatus.SCANNING],
    );

    const reset = rows.length > 0;
    this.logTransition('resetToAwaitingUpload', fileId, reset);
    return reset;
  }

  /**
   * End of a successful scan: `SCANNING` to `CLEAN` unless the file was released meanwhile.
   * Emits `storage.file_scanned` only when the row is `ATTACHED` (emission rule). Returns
   * `null` when no row matches: the caller decides whether to delete the public object.
   */
  async completeScan(input: CompleteScanInput): Promise<ScanTransitionResult | null> {
    return this.finishScan(
      {
        assignments: `scan_status = $1, public_key = $2, scanned_at = now()`,
        params: [ScanStatus.CLEAN, input.publicKey],
      },
      input.fileId,
      async (manager, row) => {
        await manager.insert<ObjectLiteral>(EventQueueModel, buildFileScannedEvent(row));
      },
      'completeScan',
    );
  }

  /**
   * End of a refused scan: `SCANNING` to `REJECTED` with its reason, under the same conditions
   * as `completeScan`. Emits `storage.file_rejected` only when the row is `ATTACHED`.
   */
  async rejectScan(input: RejectScanInput): Promise<ScanTransitionResult | null> {
    return this.finishScan(
      {
        assignments: `scan_status = $1, rejection_reason = $2, scanned_at = now()`,
        params: [ScanStatus.REJECTED, input.reason],
      },
      input.fileId,
      async (manager, row) => {
        await manager.insert<ObjectLiteral>(
          EventQueueModel,
          buildFileRejectedEvent(row, input.reason),
        );
      },
      'rejectScan',
    );
  }

  private async finishScan(
    update: { assignments: string; params: readonly string[] },
    fileId: string,
    writeEvent: ScanEventWriter,
    transition: string,
  ): Promise<ScanTransitionResult | null> {
    const result = await this.runInTransaction(transition, fileId, async (manager) => {
      const idParam = update.params.length + 1;
      const [rows] = await manager.query<UpdateReturning<ScanTransitionRow>>(
        `UPDATE files
         SET ${update.assignments}, updated_at = now()
         WHERE id = $${String(idParam)}
           AND scan_status = $${String(idParam + 1)}
           AND status NOT IN ($${String(idParam + 2)}, $${String(idParam + 3)})
         RETURNING id, status, entity_type, entity_id, owner_id`,
        [...update.params, fileId, ScanStatus.SCANNING, FileStatus.ORPHANED, FileStatus.DELETED],
      );
      const row = rows.at(0);
      if (!row) return null;

      const eventEmitted = row.status === FileStatus.ATTACHED;
      if (eventEmitted) {
        await writeEvent(manager, row);
      }
      return { fileId: row.id, status: row.status, eventEmitted };
    });

    this.logTransition(transition, fileId, result !== null);
    return result;
  }

  /**
   * Runs one transition in a transaction and logs a failure (outbox write error, invalid state)
   * before rethrowing it, so that a rolled back transition never goes unnoticed.
   */
  private async runInTransaction<T>(
    transition: string,
    fileId: string,
    work: (manager: EntityManager) => Promise<T>,
  ): Promise<T> {
    try {
      return await this.dataSource.transaction(work);
    } catch (error) {
      this.logger.error(`${transition} failed and was rolled back for file ${fileId}`, error);
      throw error;
    }
  }

  private async writeScanJob(
    manager: EntityManager,
    fileId: string,
    ownerId: string,
  ): Promise<void> {
    await manager.insert<ObjectLiteral>(JobsOutboxModel, buildScanFileJob(fileId, ownerId));
  }

  private logTransition(transition: string, fileId: string, applied: boolean): void {
    if (applied) {
      this.logger.log(`${transition} applied on file ${fileId}`);
    } else {
      this.logger.warn(`${transition} matched no row for file ${fileId}`);
    }
  }
}
