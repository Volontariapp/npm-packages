import type { StorageAttachmentRejectionReason } from '@volontariapp/messaging';
import type { NewFileData } from '../entities/file.entity.js';
import type { EntityType } from '../enums/entity-type.enum.js';
import type { FileAttachmentOutcome } from '../enums/file-attachment-outcome.enum.js';
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

export interface AttachFromConfirmationEventInput {
  /** Files named by the event (`fileIds`, `coverFileId`, `newFileId`). Duplicates are ignored. */
  fileIds: readonly string[];
  entityType: EntityType;
  entityId: string;
  /** The actor of the event (`userId`): the owner the files must belong to. */
  ownerId: string;
}

/** Outcome of `attachFromConfirmationEvent` for one file, in the order of the input. */
export interface FileAttachmentResult {
  fileId: string;
  outcome: FileAttachmentOutcome;
  /** Set when `outcome` is `REJECTED`: the reason of the `storage.attachment_rejected` event. */
  rejectionReason?: StorageAttachmentRejectionReason;
  /** True when `storage.file_scanned` / `storage.file_rejected` was written by the attachment. */
  scanEventEmitted: boolean;
}

/** Raw `files` columns returned by the `UPDATE ... RETURNING` of the attachment. */
export interface AttachedRow extends ScanTransitionRow {
  scan_status: ScanStatus;
  rejection_reason: RejectionReason | null;
}

export interface ReleaseForEntityInput {
  entityType: EntityType;
  entityId: string;
}

export interface ReleaseForEntityResult {
  /** Files moved from `RESERVED` / `ATTACHED` to `ORPHANED` by this call. */
  releasedFileIds: string[];
  /** False when the tombstone already existed (replayed release). */
  tombstoneCreated: boolean;
}

export interface ReleaseFileInput {
  /** The named file (`oldFileId` of a `*_replaced` event). */
  fileId: string;
  entityType: EntityType;
  entityId: string;
  /**
   * Owner of the file. Required to release a `PENDING` file (it belongs to no entity yet). A
   * `RESERVED` / `ATTACHED` file is matched on `(entityType, entityId)`, so leave it out when
   * the event carries no owner (badge icon, doc 11 P7); when given, it must match too.
   */
  ownerId?: string;
  /** File that replaces it: the release is skipped when it is the same file. */
  newFileId?: string;
}

export interface ReleaseForOwnerInput {
  ownerId: string;
}
