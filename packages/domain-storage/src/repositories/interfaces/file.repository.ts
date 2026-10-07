import type { FileEntity } from '../../entities/file.entity.js';
import type { EntityType } from '../../enums/entity-type.enum.js';
import type {
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
  ReserveFilesInput,
  ScanTransitionResult,
} from '../file-repository.types.js';

/**
 * Persistence port of the `files` table. Returns domain entities, never TypeORM models.
 *
 * Every transition is one conditional `UPDATE ... RETURNING` and answers `null` / `false` when
 * no row matches: the caller decides what that means (replayed request, expired upload,
 * released file).
 */
export interface IFileRepository {
  /** Declares a file (`FileEntity.create`) and inserts it as `PENDING` / `AWAITING_UPLOAD`. */
  createPending(input: CreatePendingFileInput): Promise<FileEntity>;

  findById(id: string): Promise<FileEntity | null>;
  findByIds(ids: string[]): Promise<FileEntity[]>;
  findByEntity(entityType: EntityType, entityId: string): Promise<FileEntity[]>;

  /** `AWAITING_UPLOAD` to `SCANNING`, plus the `storage.scan_file` job when ASYNC. */
  confirmUpload(input: ConfirmUploadInput): Promise<ConfirmUploadResult | null>;
  /** `SYNC` to `ASYNC` while `SCANNING`, plus the `storage.scan_file` job. */
  switchToAsync(fileId: string): Promise<boolean>;
  /** `SCANNING` back to `AWAITING_UPLOAD`, upload deadline pushed back, never shortened. */
  resetToAwaitingUpload(fileId: string): Promise<boolean>;
  /** `SCANNING` to `CLEAN`; `storage.file_scanned` only when the file is `ATTACHED`. */
  completeScan(input: CompleteScanInput): Promise<ScanTransitionResult | null>;
  /** `SCANNING` to `REJECTED`; `storage.file_rejected` only when the file is `ATTACHED`. */
  rejectScan(input: RejectScanInput): Promise<ScanTransitionResult | null>;
  /** All or nothing reservation of the files of an entity, in input order, duplicates removed. */
  reserve(input: ReserveFilesInput): Promise<FileEntity[]>;

  /**
   * Confirmation event of an entity: moves the files it names to `ATTACHED` (from `RESERVED` for
   * this entity, or from a valid `PENDING` file), with the same rule as `reserve`. A file the
   * rule refuses gets a `storage.attachment_rejected` event; a replayed event writes nothing for
   * an `ATTACHED` / `ORPHANED` file; a released entity (tombstone) releases the files instead.
   * Emits the scan result of a file attached after its scan ended. One result per file.
   */
  attachFromConfirmationEvent(
    input: AttachFromConfirmationEventInput,
  ): Promise<FileAttachmentResult[]>;
  /**
   * Release by entity (`*.deleted`, `*.creation_failed`): `RESERVED` / `ATTACHED` files of the
   * entity to `ORPHANED`, and the entity is written in `released_entities` (tombstone).
   */
  releaseForEntity(input: ReleaseForEntityInput): Promise<ReleaseForEntityResult>;
  /**
   * Release of a named file (`oldFileId` of a `*_replaced` event) from `PENDING`, `RESERVED` or
   * `ATTACHED`. Returns false when nothing matched (replay, other entity, `ORPHANED` absorbing).
   */
  releaseFile(input: ReleaseFileInput): Promise<boolean>;
  /**
   * Account deletion (`user.deleted`): every `PENDING` / `RESERVED` / `ATTACHED` file of the
   * owner to `ORPHANED`, except the platform resources (`BADGE_ICON`). Returns the released ids.
   */
  releaseForOwner(input: ReleaseForOwnerInput): Promise<string[]>;
}
