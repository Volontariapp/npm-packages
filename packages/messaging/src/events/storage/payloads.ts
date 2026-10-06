export enum StorageEventMessagingType {
  FILE_SCANNED = 'storage.file_scanned',
  FILE_REJECTED = 'storage.file_rejected',
  ATTACHMENT_REJECTED = 'storage.attachment_rejected',
}

/**
 * Entity kinds a stored file can be attached to.
 *
 * Literal union (const object plus type) instead of an `enum`: TypeScript enums are nominal,
 * so the `EntityType` enum of `@volontariapp/domain-storage` (which messaging must not depend on)
 * would not be assignable to a messaging enum. A union of string literals accepts it, because
 * every member of that enum is a subtype of the matching literal. Keep the values identical.
 */
export const StorageEntityType = {
  POST: 'POST',
  USER_AVATAR: 'USER_AVATAR',
  BADGE_ICON: 'BADGE_ICON',
  EVENT_COVER: 'EVENT_COVER',
} as const;
export type StorageEntityType = (typeof StorageEntityType)[keyof typeof StorageEntityType];

/**
 * Why a scanned file was refused. Literal union for the same reason as `StorageEntityType`:
 * the `RejectionReason` enum of `@volontariapp/domain-storage` must stay assignable to it.
 */
export const StorageFileRejectionReason = {
  SIZE_MISMATCH: 'SIZE_MISMATCH',
  MIME_MISMATCH: 'MIME_MISMATCH',
  MALWARE: 'MALWARE',
  UNDECODABLE: 'UNDECODABLE',
  SCAN_TIMEOUT: 'SCAN_TIMEOUT',
} as const;
export type StorageFileRejectionReason =
  (typeof StorageFileRejectionReason)[keyof typeof StorageFileRejectionReason];

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
