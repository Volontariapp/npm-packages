import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from '@volontariapp/database';
import { BaseRepository, EventQueueModel, JobsOutboxModel } from '@volontariapp/database';
import type { StorageEventMessagingType, StorageJobType } from '@volontariapp/messaging';
import { InternalServerError } from '@volontariapp/errors';
import { EventQueueRepository, JobsOutboxRepository } from '@volontariapp/outbox';
import { In } from 'typeorm';
import type { EntityManager } from 'typeorm';
import { FileEntity } from '../entities/file.entity.js';
import { ReleasedEntityEntity } from '../entities/released-entity.entity.js';
import { EntityType } from '../enums/entity-type.enum.js';
import { FileAttachmentOutcome } from '../enums/file-attachment-outcome.enum.js';
import { FileStatus } from '../enums/file-status.enum.js';
import { ScanStatus } from '../enums/scan-status.enum.js';
import { ValidationMode } from '../enums/validation-mode.enum.js';
import { FileAttachmentRefusedException } from '../exceptions/file-attachment-refused.exception.js';
import { FileNotFoundException } from '../exceptions/file-not-found.exception.js';
import { TooManyFilesException } from '../exceptions/too-many-files.exception.js';
// Through the index, not `file.model.js`: loading it registers the entity <-> model mappings
// (the root entry point does not, see `models/index.ts`).
import { FileModel, ReleasedEntityModel } from '../models/index.js';
import {
  classifyFileForAttachment,
  classifyFileForConfirmation,
} from '../policies/attachment-validation.rule.js';
import type {
  AttachmentVerdict,
  ConfirmationVerdict,
} from '../policies/attachment-validation.rule.js';
import { getValidationPolicy } from '../policies/get-validation-policy.js';
import {
  buildAttachmentRejectedEvent,
  buildFileRejectedEvent,
  buildFileScannedEvent,
  buildScanFileJob,
  toAttachmentRejectionReason,
} from './file-outbox.builders.js';
import type { IFileRepository } from './interfaces/file.repository.js';
import type {
  AttachedRow,
  AttachFromConfirmationEventInput,
  CompleteScanInput,
  ConfirmUploadInput,
  ConfirmUploadResult,
  CreatePendingFileInput,
  FileAttachmentResult,
  RejectScanInput,
  ReleaseFileInput,
  ReleaseForEntityInput,
  ReleaseForEntityResult,
  ReleaseForOwnerInput,
  ReservationRow,
  ReserveFilesInput,
  ScanTransitionResult,
  ScanTransitionRow,
} from './file-repository.types.js';

/** Delay added to `upload_expires_at` when a failed synchronous processing is rolled back. */
export const RESET_UPLOAD_DELAY_MINUTES = 15;

/**
 * Entity types whose files survive the deletion of their owner: platform resources, uploaded by
 * an administrator but belonging to the platform (docs/stockage-fichiers/07, section 2).
 */
export const OWNER_RELEASE_EXCLUDED_ENTITY_TYPES: readonly EntityType[] = [EntityType.BADGE_ICON];

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
   * Confirmation event of an entity (docs/stockage-fichiers/03-cycle-de-vie-fichier.md, section
   * 4), for the synchronous path (`RESERVED` for the entity) and the asynchronous one (`PENDING`
   * file never reserved). One transaction, under the lock of the entity (`pg_advisory_xact_lock`,
   * doc 11 P1):
   *
   * 1. The entity has a tombstone: the named `PENDING` / `RESERVED` files of the owner are moved
   *    to `ORPHANED` instead of attached, and nothing else is written.
   * 2. Otherwise the named rows are locked (`SELECT ... FOR UPDATE ORDER BY id`) and each one is
   *    classified by `classifyFileForConfirmation`, which applies the rule of `reserve`
   *    (`classifyFileForAttachment`) to everything not already held by the entity. The files to
   *    attach are moved with a single `UPDATE ... RETURNING`.
   * 3. A file attached after its scan ended emits `storage.file_scanned` / `storage.file_rejected`
   *    (emission rule: the later of the scan and the attachment emits; the scan transition sees
   *    `ATTACHED` in its own `RETURNING` when it comes second). A file the rule refuses writes
   *    `storage.attachment_rejected`. A file already `ATTACHED` / `ORPHANED` for the entity
   *    (replayed event) writes nothing.
   *
   * No condition on a date: a late event attaches a file whose reservation has expired. All the
   * events are written in the same transaction as the updates, so a failure rolls everything
   * back and the redelivered event starts again. Events are written with an empty
   * `targetServices` until `StorageStream` exists (see `FILE_SCAN_RESULT_TARGET_SERVICES`).
   */
  async attachFromConfirmationEvent(
    input: AttachFromConfirmationEventInput,
  ): Promise<FileAttachmentResult[]> {
    getValidationPolicy(input.entityType);
    const fileIds = [...new Set(input.fileIds.map((fileId) => fileId.toLowerCase()))];
    if (fileIds.length === 0) return [];

    const label = `${input.entityType} ${input.entityId}`;
    const results = await this.runInTransaction(
      'attachFromConfirmationEvent',
      label,
      async (manager) => {
        await this.lockEntity(manager, input.entityType, input.entityId);

        const released = await manager
          .getRepository(ReleasedEntityModel)
          .existsBy({ entityType: input.entityType, entityId: input.entityId });
        if (released) {
          await manager.query(
            `UPDATE files
           SET status = $1, entity_id = $2, updated_at = now()
           WHERE id = ANY($3::uuid[]) AND entity_type = $4 AND owner_id = $5
             AND (status = $6 OR (status = $7 AND entity_id = $2))`,
            [
              FileStatus.ORPHANED,
              input.entityId,
              fileIds,
              input.entityType,
              input.ownerId,
              FileStatus.PENDING,
              FileStatus.RESERVED,
            ],
          );
          return fileIds.map(
            (fileId): FileAttachmentResult => ({
              fileId,
              outcome: FileAttachmentOutcome.ENTITY_RELEASED,
              scanEventEmitted: false,
            }),
          );
        }

        const rows = await manager.query<ReservationRow[]>(
          `SELECT id, owner_id, entity_type, entity_id, status, scan_status
         FROM files
         WHERE id = ANY($1::uuid[])
         ORDER BY id
         FOR UPDATE`,
          [fileIds],
        );
        const rowById = new Map(rows.map((row) => [row.id, row]));

        const verdicts = fileIds.map((fileId): [string, ConfirmationVerdict] => {
          const row = rowById.get(fileId);
          return [
            fileId,
            classifyFileForConfirmation(
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

        const toAttach = verdicts
          .filter(
            ([, verdict]) =>
              verdict.kind === 'ATTACH_RESERVED' || verdict.kind === 'ATTACH_PENDING',
          )
          .map(([fileId]) => fileId);
        const attachedById = new Map<string, AttachedRow>();
        if (toAttach.length > 0) {
          const [attached] = await manager.query<UpdateReturning<AttachedRow>>(
            `UPDATE files
           SET status = $1, entity_id = $2, attached_at = now(), updated_at = now()
           WHERE id = ANY($3::uuid[]) AND entity_type = $4
             AND ((status = $5 AND entity_id = $2) OR (status = $6 AND owner_id = $7))
           RETURNING id, status, entity_type, entity_id, owner_id, scan_status, rejection_reason`,
            [
              FileStatus.ATTACHED,
              input.entityId,
              toAttach,
              input.entityType,
              FileStatus.RESERVED,
              FileStatus.PENDING,
              input.ownerId,
            ],
          );
          for (const row of attached) attachedById.set(row.id, row);
        }

        const outcomes: FileAttachmentResult[] = [];
        for (const [fileId, verdict] of verdicts) {
          outcomes.push(
            await this.settleConfirmation(
              manager,
              fileId,
              verdict,
              attachedById.get(fileId),
              rowById.get(fileId),
              input,
            ),
          );
        }
        return outcomes;
      },
    );

    this.logger.log(
      `attachFromConfirmationEvent for ${label}: ${results
        .map((result) => `${result.fileId}=${result.outcome}`)
        .join(', ')}`,
    );
    return results;
  }

  /** Writes the event of one file of `attachFromConfirmationEvent`, inside its transaction. */
  private async settleConfirmation(
    manager: EntityManager,
    fileId: string,
    verdict: ConfirmationVerdict,
    attached: AttachedRow | undefined,
    locked: ReservationRow | undefined,
    input: AttachFromConfirmationEventInput,
  ): Promise<FileAttachmentResult> {
    switch (verdict.kind) {
      case 'ATTACH_RESERVED':
      case 'ATTACH_PENDING': {
        if (!attached) {
          // The row is locked and was classified in this transaction: this cannot happen.
          throw new InternalServerError(
            `File ${fileId} was classified attachable but the update matched no row`,
            'FILE_ATTACHMENT_LOST',
            { fileId },
          );
        }
        const scanEventEmitted = await this.emitScanResultOfAttachedFile(manager, attached);
        return { fileId, outcome: FileAttachmentOutcome.ATTACHED, scanEventEmitted };
      }
      case 'ALREADY_ATTACHED':
        return { fileId, outcome: FileAttachmentOutcome.ALREADY_ATTACHED, scanEventEmitted: false };
      case 'ALREADY_RELEASED':
        return { fileId, outcome: FileAttachmentOutcome.ALREADY_RELEASED, scanEventEmitted: false };
      case 'REJECTED': {
        const rejectionReason = toAttachmentRejectionReason(
          verdict.refusal,
          locked?.scan_status ?? null,
        );
        await this.eventQueueRepository<StorageEventMessagingType.ATTACHMENT_REJECTED>(
          manager,
        ).create(
          buildAttachmentRejectedEvent(
            {
              fileId,
              entityType: input.entityType,
              entityId: input.entityId,
              reason: rejectionReason,
            },
            input.ownerId,
          ),
        );
        return {
          fileId,
          outcome: FileAttachmentOutcome.REJECTED,
          rejectionReason,
          scanEventEmitted: false,
        };
      }
    }
  }

  /**
   * Emission rule, attachment side: a file that has just become `ATTACHED` emits the result of a
   * scan that already ended (`CLEAN` or `REJECTED`); with `SCANNING` or `AWAITING_UPLOAD` the
   * scan transition will emit, as it sees `ATTACHED` in its own `RETURNING`.
   */
  private async emitScanResultOfAttachedFile(
    manager: EntityManager,
    row: AttachedRow,
  ): Promise<boolean> {
    if (row.scan_status === ScanStatus.CLEAN) {
      await this.eventQueueRepository<StorageEventMessagingType.FILE_SCANNED>(manager).create(
        buildFileScannedEvent(row),
      );
      return true;
    }
    if (row.scan_status === ScanStatus.REJECTED) {
      if (row.rejection_reason === null) {
        throw new InternalServerError(
          `Rejected file ${row.id} has no rejection reason`,
          'FILE_REJECTED_WITHOUT_REASON',
          { fileId: row.id },
        );
      }
      await this.eventQueueRepository<StorageEventMessagingType.FILE_REJECTED>(manager).create(
        buildFileRejectedEvent(row, row.rejection_reason),
      );
      return true;
    }
    return false;
  }

  /**
   * Release by entity (`*.deleted`, `*.creation_failed`), under the lock of the entity: the
   * tombstone is written in `released_entities` (`ON CONFLICT DO NOTHING`, the first release date
   * is kept), then the `RESERVED` / `ATTACHED` files of the entity move to `ORPHANED` with one
   * `UPDATE`. `PENDING` files are not seen here (no `entity_id` yet): the tombstone makes
   * `attachFromConfirmationEvent` release them when their late event arrives. Replaying it
   * changes nothing. `ORPHANED` and `DELETED` files are never touched. Writes no event.
   */
  async releaseForEntity(input: ReleaseForEntityInput): Promise<ReleaseForEntityResult> {
    const tombstone = ReleasedEntityEntity.create(input);
    const label = `${input.entityType} ${input.entityId}`;

    const result = await this.runInTransaction('releaseForEntity', label, async (manager) => {
      await this.lockEntity(manager, input.entityType, input.entityId);

      const inserted = await manager
        .getRepository(ReleasedEntityModel)
        .createQueryBuilder()
        .insert()
        .values(this.mapper.map(tombstone, ReleasedEntityEntity, ReleasedEntityModel))
        .orIgnore()
        .returning('entity_id')
        .execute();

      const [released] = await manager.query<UpdateReturning<{ id: string }>>(
        `UPDATE files
         SET status = $1, updated_at = now()
         WHERE entity_type = $2 AND entity_id = $3 AND status IN ($4, $5)
         RETURNING id`,
        [
          FileStatus.ORPHANED,
          input.entityType,
          input.entityId,
          FileStatus.RESERVED,
          FileStatus.ATTACHED,
        ],
      );
      return {
        releasedFileIds: released.map((row) => row.id),
        tombstoneCreated: Array.isArray(inserted.raw) && inserted.raw.length > 0,
      };
    });

    this.logger.log(
      `releaseForEntity for ${label}: ${String(result.releasedFileIds.length)} file(s) released, tombstone ${result.tombstoneCreated ? 'written' : 'already present'}`,
    );
    return result;
  }

  /**
   * Release of a named file (`oldFileId` of a `*_replaced` event): `PENDING`, `RESERVED` or
   * `ATTACHED` to `ORPHANED` with one conditional `UPDATE ... RETURNING`. A `RESERVED` /
   * `ATTACHED` file must be held by `(entityType, entityId)` (and by `ownerId` when given); a
   * `PENDING` file must belong to `ownerId` and gets the `entity_id`, so that a late confirmation
   * event for it is recognised as released instead of rejected. `ORPHANED` and `DELETED` are
   * absorbing: they match nothing. Skipped when `newFileId` is the same file. Writes no event.
   * Returns whether a file was released.
   */
  async releaseFile(input: ReleaseFileInput): Promise<boolean> {
    if (input.newFileId?.toLowerCase() === input.fileId.toLowerCase()) {
      this.logger.warn(`releaseFile skipped for file ${input.fileId}: it is its own replacement`);
      return false;
    }

    const released = await this.runInTransaction('releaseFile', input.fileId, async (manager) => {
      const [rows] = await manager.query<UpdateReturning<{ id: string }>>(
        `UPDATE files
         SET status = $1, entity_id = $2, updated_at = now()
         WHERE id = $3 AND entity_type = $4
           AND (
             (status IN ($5, $6) AND entity_id = $2 AND ($7::uuid IS NULL OR owner_id = $7))
             OR (status = $8 AND owner_id = $7)
           )
         RETURNING id`,
        [
          FileStatus.ORPHANED,
          input.entityId,
          input.fileId,
          input.entityType,
          FileStatus.RESERVED,
          FileStatus.ATTACHED,
          input.ownerId ?? null,
          FileStatus.PENDING,
        ],
      );
      return rows.length > 0;
    });

    this.logTransition('releaseFile', input.fileId, released);
    return released;
  }

  /**
   * Account deletion (`user.deleted`): one `UPDATE` moves every `PENDING`, `RESERVED` or
   * `ATTACHED` file of the owner to `ORPHANED`, except the platform resources
   * (`OWNER_RELEASE_EXCLUDED_ENTITY_TYPES`). It covers the files of posts removed without a
   * `post.deleted`. No tombstone (no entity): a late confirmation event of a released `PENDING`
   * file is refused with `storage.attachment_rejected`. Returns the released file ids.
   */
  async releaseForOwner(input: ReleaseForOwnerInput): Promise<string[]> {
    const [rows] = await this.repository.manager.query<UpdateReturning<{ id: string }>>(
      `UPDATE files
       SET status = $1, updated_at = now()
       WHERE owner_id = $2
         AND entity_type <> ALL($3::varchar[])
         AND status IN ($4, $5, $6)
       RETURNING id`,
      [
        FileStatus.ORPHANED,
        input.ownerId,
        OWNER_RELEASE_EXCLUDED_ENTITY_TYPES,
        FileStatus.PENDING,
        FileStatus.RESERVED,
        FileStatus.ATTACHED,
      ],
    );

    this.logger.log(
      `releaseForOwner for ${input.ownerId}: ${String(rows.length)} file(s) released`,
    );
    return rows.map((row) => row.id);
  }

  /**
   * Serialises the confirmation and the release of one entity (doc 11 P1): without it, the
   * attachment can read `released_entities` before the commit of a concurrent release, and attach
   * a file to a released entity. Held until the end of the transaction.
   */
  private async lockEntity(
    manager: EntityManager,
    entityType: EntityType,
    entityId: string,
  ): Promise<void> {
    await manager.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [
      `${entityType}:${entityId.toLowerCase()}`,
    ]);
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
