import type { NewFileData } from '../entities/file.entity.js';
import type { EntityType } from '../enums/entity-type.enum.js';
import type { FileStatus } from '../enums/file-status.enum.js';
import type { ScanStatus } from '../enums/scan-status.enum.js';
import type { RejectionReason } from '../enums/rejection-reason.enum.js';
import type { ValidationMode } from '../enums/validation-mode.enum.js';

/** Input of `createPending`: the data `FileEntity.create` needs to declare a file. */
export type CreatePendingFileInput = NewFileData;

export interface ConfirmUploadInput {
  fileId: string;
  ownerId: string;
  actualSize: number;
}

export interface ConfirmUploadResult {
  id: string;
  validationMode: ValidationMode;
}

export interface ReserveFilesInput {
  /** Duplicates are ignored. At most `maxPerEntity` distinct ids for the `entityType`. */
  fileIds: readonly string[];
  entityType: EntityType;
  entityId: string;
  /** The `CurrentUser` of the `INTERNAL_TOKEN`, never read from a payload. */
  ownerId: string;
}

/** Locked `files` columns read by `reserve` before the attachment rule is applied. */
export interface ReservationRow {
  id: string;
  owner_id: string;
  entity_type: EntityType;
  entity_id: string | null;
  status: FileStatus;
  scan_status: ScanStatus;
}

export interface CompleteScanInput {
  fileId: string;
  publicKey: string;
}

export interface RejectScanInput {
  fileId: string;
  reason: RejectionReason;
}

/** Outcome of an applied `completeScan` / `rejectScan` transition. */
export interface ScanTransitionResult {
  fileId: string;
  /** Attachment status read in the `RETURNING` of the transition itself. */
  status: FileStatus;
  /** True when `storage.file_scanned` / `storage.file_rejected` was written to `event_queue`. */
  eventEmitted: boolean;
}

/** Raw `files` columns returned by the `UPDATE ... RETURNING` of the scan transitions. */
export interface ScanTransitionRow {
  id: string;
  status: FileStatus;
  entity_type: EntityType;
  entity_id: string | null;
  owner_id: string;
}
