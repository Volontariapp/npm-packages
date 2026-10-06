import { AttachmentRefusalReason } from '../enums/attachment-refusal-reason.enum.js';
import type { EntityType } from '../enums/entity-type.enum.js';
import { FileStatus } from '../enums/file-status.enum.js';
import { ScanStatus } from '../enums/scan-status.enum.js';
import { getValidationPolicy } from './get-validation-policy.js';

/** The columns of a `files` row that the attachment rule reads. */
export interface AttachmentCandidate {
  ownerId: string;
  entityType: EntityType;
  entityId: string | null;
  status: FileStatus;
  scanStatus: ScanStatus;
}

/** The entity a caller wants to attach a file to, on behalf of `ownerId`. */
export interface AttachmentTarget {
  ownerId: string;
  entityType: EntityType;
  entityId: string;
}

export type AttachmentVerdict =
  /** `PENDING` and valid: to be moved to `RESERVED`. */
  | { readonly kind: 'RESERVE' }
  /** Already `RESERVED` or `ATTACHED` for this very entity: a retry, nothing to write. */
  | { readonly kind: 'ALREADY_HELD' }
  /** Unknown file or file of another owner: indistinguishable on purpose. */
  | { readonly kind: 'NOT_FOUND' }
  | { readonly kind: 'REFUSED'; readonly reason: AttachmentRefusalReason };

const RESERVE: AttachmentVerdict = { kind: 'RESERVE' };
const ALREADY_HELD: AttachmentVerdict = { kind: 'ALREADY_HELD' };
const NOT_FOUND: AttachmentVerdict = { kind: 'NOT_FOUND' };

const refused = (reason: AttachmentRefusalReason): AttachmentVerdict => ({
  kind: 'REFUSED',
  reason,
});

const isSameEntity = (file: AttachmentCandidate, target: AttachmentTarget): boolean =>
  file.entityType === target.entityType &&
  file.entityId?.toLowerCase() === target.entityId.toLowerCase();

/**
 * The single attachment validation rule (docs/stockage-fichiers/03-cycle-de-vie-fichier.md,
 * section 3), shared by the synchronous reservation and the asynchronous attachment.
 * Conditions are evaluated in this order, the first that applies wins:
 *
 * 1. `null` (unknown file) or another owner: `NOT_FOUND`, so that the existence of the file of
 *    someone else is never revealed.
 * 2. `entity_type` different from the declared one: refused.
 * 3. `scan_status` `AWAITING_UPLOAD` or `REJECTED`, or `SCANNING` when the `EntityType` does
 *    not allow ASYNC (avatar, badge): refused.
 * 4. `RESERVED` or `ATTACHED` for the same `(entity_type, entity_id)`: `ALREADY_HELD`.
 * 5. `RESERVED` or `ATTACHED` for another entity, `ORPHANED` or `DELETED`: refused.
 * 6. Otherwise the file is `PENDING`, `CLEAN` or `SCANNING` with ASYNC: `RESERVE`.
 */
export function classifyFileForAttachment(
  file: AttachmentCandidate | null,
  target: AttachmentTarget,
): AttachmentVerdict {
  if (file?.ownerId !== target.ownerId) {
    return NOT_FOUND;
  }

  if (file.entityType !== target.entityType) {
    return refused(AttachmentRefusalReason.ENTITY_TYPE_MISMATCH);
  }

  const { asyncAllowed } = getValidationPolicy(target.entityType);
  const scanAccepted =
    file.scanStatus === ScanStatus.CLEAN ||
    (file.scanStatus === ScanStatus.SCANNING && asyncAllowed);
  if (!scanAccepted) {
    return refused(AttachmentRefusalReason.SCAN_STATUS_NOT_ACCEPTED);
  }

  switch (file.status) {
    case FileStatus.PENDING:
      return RESERVE;
    case FileStatus.RESERVED:
    case FileStatus.ATTACHED:
      return isSameEntity(file, target)
        ? ALREADY_HELD
        : refused(AttachmentRefusalReason.ATTACHED_TO_ANOTHER_ENTITY);
    case FileStatus.ORPHANED:
    case FileStatus.DELETED:
      return refused(AttachmentRefusalReason.FILE_RELEASED);
  }
}
