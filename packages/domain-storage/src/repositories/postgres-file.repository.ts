import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from '@volontariapp/database';
import { BaseRepository, EventQueueModel, JobsOutboxModel } from '@volontariapp/database';
import type { StorageEventMessagingType, StorageJobType } from '@volontariapp/messaging';
import { EventQueueRepository, JobsOutboxRepository } from '@volontariapp/outbox';
import { In } from 'typeorm';
import type { EntityManager } from 'typeorm';
import { FileEntity } from '../entities/file.entity.js';
import type { EntityType } from '../enums/entity-type.enum.js';
import { FileStatus } from '../enums/file-status.enum.js';
import { ScanStatus } from '../enums/scan-status.enum.js';
import { ValidationMode } from '../enums/validation-mode.enum.js';
import { FileAttachmentRefusedException } from '../exceptions/file-attachment-refused.exception.js';
import { FileNotFoundException } from '../exceptions/file-not-found.exception.js';
import { TooManyFilesException } from '../exceptions/too-many-files.exception.js';
// Through the index, not `file.model.js`: loading it registers the entity <-> model mappings
// (the root entry point does not, see `models/index.ts`).
import { FileModel } from '../models/index.js';
import { classifyFileForAttachment } from '../policies/attachment-validation.rule.js';
import type { AttachmentVerdict } from '../policies/attachment-validation.rule.js';
import { getValidationPolicy } from '../policies/get-validation-policy.js';
import {
  buildFileRejectedEvent,
  buildFileScannedEvent,
  buildScanFileJob,
} from './file-outbox.builders.js';
import type { IFileRepository } from './interfaces/file.repository.js';
import type {
  CompleteScanInput,
  ConfirmUploadInput,
  ConfirmUploadResult,
  CreatePendingFileInput,
  RejectScanInput,
  ReservationRow,
  ReserveFilesInput,
  ScanTransitionResult,
  ScanTransitionRow,
} from './file-repository.types.js';

/** Delay added to `upload_expires_at` when a failed synchronous processing is rolled back. */
export const RESET_UPLOAD_DELAY_MINUTES = 15;

type UpdateReturning<TRow> = [TRow[], number];

/** Result of the transaction of `reserve`: the refusal is thrown once the transaction is over. */
type ReserveOutcome = { failure: Error } | { files: FileModel[] };

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
@Injectable()
export class PostgresFileRepository
  extends BaseRepository<FileModel, FileEntity>
  implements IFileRepository
{
  constructor(@InjectRepository(FileModel) repository: Repository<FileModel>) {
    super(repository, FileEntity, FileModel);
  }

  /**
   * Declares the file with `FileEntity.create` (which holds the invariants) and inserts it as
   * `PENDING` / `AWAITING_UPLOAD`.
   */
  async createPending(input: CreatePendingFileInput): Promise<FileEntity> {
    const file = FileEntity.create(input);
    // `insert`, never `BaseRepository.create`: `save` would silently update a row that already
    // has this id, while `insert` fails on the primary key.
    await this.repository.insert(this.toModel(file));
    const saved = await this.findOneOrFail({ id: file.id });
    this.logger.log(`File ${saved.id} created, awaiting upload (${saved.validationMode})`);
    return saved;
  }

  async findByEntity(entityType: EntityType, entityId: string): Promise<FileEntity[]> {
    return this.find({ where: { entityType, entityId }, order: { createdAt: 'ASC', id: 'ASC' } });
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
    const [rows] = await this.repository.manager.query<UpdateReturning<{ id: string }>>(
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
   * Synchronous reservation (`ConfirmFileAttachment`): all or nothing. Locks the rows with
   * `SELECT ... FOR UPDATE` (in id order, so that two concurrent reservations cannot deadlock),
   * classifies each one with the shared attachment rule, then moves the `PENDING` ones to
   * `RESERVED` with a single `UPDATE`. A file already `RESERVED` / `ATTACHED` for the same
   * entity is returned as is (idempotent retry). Writes no event.
   *
   * Throws `TooManyFilesException` above `maxPerEntity` distinct ids, `FileNotFoundException`
   * for an unknown file or one of another owner (it wins over any other refusal), and
   * `FileAttachmentRefusedException` for the first refused file, in input order. Nothing is
   * written when it throws. Returns the files in input order, duplicates removed.
   */
  async reserve(input: ReserveFilesInput): Promise<FileEntity[]> {
    const fileIds = [...new Set(input.fileIds)];
    const { maxPerEntity } = getValidationPolicy(input.entityType);
    if (fileIds.length > maxPerEntity) {
      throw new TooManyFilesException(input.entityType, fileIds.length, maxPerEntity);
    }
    if (fileIds.length === 0) return [];

    const label = `${input.entityType} ${input.entityId}`;
    const outcome = await this.runInTransaction<ReserveOutcome>(
      'reserve',
      label,
      async (manager) => {
        const rows = await manager.query<ReservationRow[]>(
          `SELECT id, owner_id, entity_type, entity_id, status, scan_status
         FROM files
         WHERE id = ANY($1::uuid[])
         ORDER BY id
         FOR UPDATE`,
          [fileIds],
        );
        const rowById = new Map(rows.map((row) => [row.id, row]));

        const verdicts = fileIds.map((fileId): [string, AttachmentVerdict] => {
          const row = rowById.get(fileId);
          return [
            fileId,
            classifyFileForAttachment(
              row
                ? {
                    ownerId: row.owner_id,
                    entityType: row.entity_type,
                    entityId: row.entity_id,
                    status: row.status,
                    scanStatus: row.scan_status,
                  }
                : null,
              input,
            ),
          ];
        });

        const missing = verdicts.find(([, verdict]) => verdict.kind === 'NOT_FOUND');
        if (missing) return { failure: new FileNotFoundException(missing[0]) };

        for (const [fileId, verdict] of verdicts) {
          if (verdict.kind === 'REFUSED') {
            return {
              failure: new FileAttachmentRefusedException(
                fileId,
                verdict.reason,
                input.entityType,
                input.entityId,
              ),
            };
          }
        }

        const toReserve = verdicts
          .filter(([, verdict]) => verdict.kind === 'RESERVE')
          .map(([fileId]) => fileId);
        if (toReserve.length > 0) {
          await manager.query(
            `UPDATE files
           SET status = $1, entity_id = $2, reserved_at = now(), updated_at = now()
           WHERE id = ANY($3::uuid[]) AND status = $4`,
            [FileStatus.RESERVED, input.entityId, toReserve, FileStatus.PENDING],
          );
        }

        const files = await manager.find(FileModel, { where: { id: In(fileIds) } });
        const fileById = new Map(files.map((file) => [file.id, file]));
        return { files: fileIds.flatMap((fileId) => fileById.get(fileId) ?? []) };
      },
    );

    if ('failure' in outcome) {
      const { failure } = outcome;
      this.logger.warn(`reserve refused for ${label}: ${failure.message}`);
      throw failure;
    }

    this.logger.log(`reserve applied for ${label}: ${String(outcome.files.length)} file(s)`);
    return this.toEntities(outcome.files);
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
        await this.eventQueueRepository<StorageEventMessagingType.FILE_SCANNED>(manager).create(
          buildFileScannedEvent(row),
        );
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
        await this.eventQueueRepository<StorageEventMessagingType.FILE_REJECTED>(manager).create(
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
      return await this.repository.manager.transaction(work);
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
    await new JobsOutboxRepository<StorageJobType.SCAN_FILE>(
      manager.getRepository(JobsOutboxModel),
    ).create(buildScanFileJob(fileId, ownerId));
  }

  /** Outbox repository bound to the transaction of `manager`, as in `domain-post`. */
  private eventQueueRepository<K extends StorageEventMessagingType>(
    manager: EntityManager,
  ): EventQueueRepository<K> {
    return new EventQueueRepository<K>(manager.getRepository(EventQueueModel));
  }

  private logTransition(transition: string, fileId: string, applied: boolean): void {
    if (applied) {
      this.logger.log(`${transition} applied on file ${fileId}`);
    } else {
      this.logger.warn(`${transition} matched no row for file ${fileId}`);
    }
  }
}
