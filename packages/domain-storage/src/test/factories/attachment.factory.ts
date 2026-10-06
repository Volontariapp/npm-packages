import { EntityType } from '../../enums/entity-type.enum.js';
import { FileStatus } from '../../enums/file-status.enum.js';
import { ScanStatus } from '../../enums/scan-status.enum.js';
import type {
  AttachmentCandidate,
  AttachmentTarget,
} from '../../policies/attachment-validation.rule.js';
import { FileId } from '../../value-objects/file-id.vo.js';

export const buildAttachmentTarget = (
  overrides: Partial<AttachmentTarget> = {},
): AttachmentTarget => ({
  ownerId: FileId.generate().getValue(),
  entityType: EntityType.POST,
  entityId: FileId.generate().getValue(),
  ...overrides,
});

/** A valid candidate for `target`: `PENDING` and `CLEAN`, owned by the target owner. */
export const buildAttachmentCandidate = (
  target: AttachmentTarget,
  overrides: Partial<AttachmentCandidate> = {},
): AttachmentCandidate => ({
  ownerId: target.ownerId,
  entityType: target.entityType,
  entityId: null,
  status: FileStatus.PENDING,
  scanStatus: ScanStatus.CLEAN,
  ...overrides,
});
