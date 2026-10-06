export enum StorageEventMessagingType {
  FILE_SCANNED = 'storage.file_scanned',
  FILE_REJECTED = 'storage.file_rejected',
  ATTACHMENT_REJECTED = 'storage.attachment_rejected',
}

/**
 * Entity kinds a stored file can be attached to. Values mirror the `EntityType`
 * of `@volontariapp/domain-storage`, which messaging must not depend on.
 */
export enum StorageEntityType {
  POST = 'POST',
  USER_AVATAR = 'USER_AVATAR',
  BADGE_ICON = 'BADGE_ICON',
  EVENT_COVER = 'EVENT_COVER',
}

/** Why a scanned file was refused. Values mirror `RejectionReason` of the storage contract. */
export enum StorageFileRejectionReason {
  SIZE_MISMATCH = 'SIZE_MISMATCH',
  MIME_MISMATCH = 'MIME_MISMATCH',
  MALWARE = 'MALWARE',
  UNDECODABLE = 'UNDECODABLE',
  SCAN_TIMEOUT = 'SCAN_TIMEOUT',
}

/** Why an asynchronous attachment of a file to an entity was refused. */
export enum StorageAttachmentRejectionReason {
  NOT_FOUND = 'NOT_FOUND',
  WRONG_ENTITY_TYPE = 'WRONG_ENTITY_TYPE',
  NOT_CONFIRMED = 'NOT_CONFIRMED',
  CONTENT_REJECTED = 'CONTENT_REJECTED',
  ALREADY_ATTACHED = 'ALREADY_ATTACHED',
}

export interface IStorageFileEntityPayload {
  fileId: string;
  entityType: StorageEntityType;
  entityId: string;
}

export interface IFileScannedPayload extends IStorageFileEntityPayload {
  ownerId: string;
}

export interface IFileRejectedPayload extends IFileScannedPayload {
  reason: StorageFileRejectionReason;
}

export interface IAttachmentRejectedPayload extends IStorageFileEntityPayload {
  reason: StorageAttachmentRejectionReason;
}
