import type { FileEntity } from '../../entities/file.entity.js';
import type { EntityType } from '../../enums/entity-type.enum.js';
import type {
  CompleteScanInput,
  ConfirmUploadInput,
  ConfirmUploadResult,
  CreatePendingFileInput,
  RejectScanInput,
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
}
