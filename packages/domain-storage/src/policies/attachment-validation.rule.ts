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

export type ConfirmationVerdict =
  /** `RESERVED` for this very entity (synchronous path): to be moved to `ATTACHED`. */
  | { readonly kind: 'ATTACH_RESERVED' }
  /** `PENDING` and valid under the shared rule (asynchronous path): to be moved to `ATTACHED`. */
  | { readonly kind: 'ATTACH_PENDING' }
  /** Already `ATTACHED` to this very entity: the event is a replay, nothing to write. */
  | { readonly kind: 'ALREADY_ATTACHED' }
  /** `ORPHANED` or `DELETED` for this very entity: the release came first, nothing to write. */
  | { readonly kind: 'ALREADY_RELEASED' }
  /** The file cannot be attached: `storage.attachment_rejected` must be written. */
  | { readonly kind: 'REJECTED'; readonly refusal: AttachmentRefusalReason | 'NOT_FOUND' };

const ATTACH_RESERVED: ConfirmationVerdict = { kind: 'ATTACH_RESERVED' };
const ATTACH_PENDING: ConfirmationVerdict = { kind: 'ATTACH_PENDING' };
const ALREADY_ATTACHED: ConfirmationVerdict = { kind: 'ALREADY_ATTACHED' };
const ALREADY_RELEASED: ConfirmationVerdict = { kind: 'ALREADY_RELEASED' };

/**
 * Verdict for a file that the owner already holds for this very entity. Independent of the
 * scan: a file reserved while `SCANNING` is attached whatever the scan became since, and
 * the result is then emitted by the attachment itself (docs/stockage-fichiers/03, section 4).
 */
const verdictForHeldFile = (status: FileStatus): ConfirmationVerdict | null => {
  switch (status) {
    case FileStatus.RESERVED:
      return ATTACH_RESERVED;
    case FileStatus.ATTACHED:
      return ALREADY_ATTACHED;
    case FileStatus.ORPHANED:
    case FileStatus.DELETED:
      return ALREADY_RELEASED;
    case FileStatus.PENDING:
      return null;
  }
};

/**
 * What the confirmation event of an entity (`post.created`, `*_replaced`, ...) does to a file it
 * names (docs/stockage-fichiers/03-cycle-de-vie-fichier.md, section 4, step 2 and 3). It covers
 * the synchronous path (`RESERVED` for the entity) and the asynchronous one (`PENDING`), and it
 * is the same rule as the reservation: every file that is not already held by this entity goes
 * through `classifyFileForAttachment`, so the two paths can never disagree on what is valid.
 *
 * A file already held by the entity (same owner, type and id) is settled by its status first,
 * whatever its scan: a replayed event finds it `ATTACHED` (nothing to do), a release that came
 * first finds it `ORPHANED` (nothing to do).
 */
export function classifyFileForConfirmation(
  file: AttachmentCandidate | null,
  target: AttachmentTarget,
): ConfirmationVerdict {
  if (file?.ownerId === target.ownerId && isSameEntity(file, target)) {
    const held = verdictForHeldFile(file.status);
    if (held) return held;
  }

  const verdict = classifyFileForAttachment(file, target);
  switch (verdict.kind) {
    case 'RESERVE':
      return ATTACH_PENDING;
    case 'NOT_FOUND':
      return { kind: 'REJECTED', refusal: 'NOT_FOUND' };
    case 'REFUSED':
      return { kind: 'REJECTED', refusal: verdict.reason };
    case 'ALREADY_HELD':
      // Unreachable in practice: a file held for this entity by this owner is settled above.
      return ALREADY_ATTACHED;
  }
}
