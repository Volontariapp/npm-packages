import {
  StorageAttachmentRejectionReason,
  StorageEntityType,
  StorageFileRejectionReason,
} from '../events/index.js';
import type {
  IAttachmentRejectedPayload,
  IFileRejectedPayload,
  IFileScannedPayload,
} from '../events/index.js';
import type { IScanFilePayload } from '../jobs/index.js';

export const buildScanFilePayload = (
  overrides: Partial<IScanFilePayload> = {},
): IScanFilePayload => ({
  fileId: 'file-1',
  ...overrides,
});

export const buildFileScannedPayload = (
  overrides: Partial<IFileScannedPayload> = {},
): IFileScannedPayload => ({
  fileId: 'file-1',
  ownerId: 'user-1',
  entityType: StorageEntityType.POST,
  entityId: 'post-1',
  ...overrides,
});

export const buildFileRejectedPayload = (
  overrides: Partial<IFileRejectedPayload> = {},
): IFileRejectedPayload => ({
  ...buildFileScannedPayload(),
  reason: StorageFileRejectionReason.MALWARE,
  ...overrides,
});

export const buildAttachmentRejectedPayload = (
  overrides: Partial<IAttachmentRejectedPayload> = {},
): IAttachmentRejectedPayload => ({
  fileId: 'file-1',
  entityType: StorageEntityType.EVENT_COVER,
  entityId: 'event-1',
  reason: StorageAttachmentRejectionReason.NOT_FOUND,
  ...overrides,
});
