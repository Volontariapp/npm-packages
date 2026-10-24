import type {
  StorageEntityType,
  StorageFileRejectionReason,
  StorageAttachmentRejectionReason,
} from '../../index.js';

export interface IStorageFileScannedWebsocketPayload {
  fileId: string;
  entityType: StorageEntityType;
  entityId: string;
  ownerId: string;
}

export interface IStorageFileRejectedWebsocketPayload extends IStorageFileScannedWebsocketPayload {
  reason: StorageFileRejectionReason;
}

export interface IStorageAttachmentRejectedWebsocketPayload {
  fileId: string;
  entityType: StorageEntityType;
  entityId: string;
  reason: StorageAttachmentRejectionReason;
}
