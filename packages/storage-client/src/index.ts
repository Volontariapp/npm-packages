export * from './constants.js';
export * from './interfaces/index.js';
export * from './errors/index.js';
export * from './services/storage-client.service.js';
export * from './storage-client.module.js';

// Re-exports from contracts-nest for convenience
export {
  STORAGE_SERVICE_NAME,
  EntityType,
  FileStatus,
  ScanStatus,
  type ConfirmFileAttachmentCommand,
  type ConfirmFileAttachmentResponse,
  type FileMetadata,
  type StorageServiceClient,
} from '@volontariapp/contracts-nest';

// Re-exports from errors-nest for convenience
export {
  FILE_NOT_FOUND,
  STORAGE_ATTACHMENT_FAILED,
  STORAGE_TIMEOUT,
  INVALID_FILE_ATTACHMENT,
} from '@volontariapp/errors-nest';
