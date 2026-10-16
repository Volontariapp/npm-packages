import type { FileMetadata } from '../../../storage/storage.js';

/**
 * REST-friendly file metadata with Date objects.
 * The deprecated isPublic flag is not exposed: visibility is derived from scanStatus.
 */
export interface FileMetadataDTO
  extends Omit<FileMetadata, 'uploadExpiresAt' | 'createdAt' | 'updatedAt' | 'isPublic'> {
  uploadExpiresAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface GenerateUploadUrlWebResponse {
  fileId: string;
  uploadUrl: string;
  uploadFields: Record<string, string>;
  expiresAt?: Date;
}

export interface ConfirmUploadWebResponse {
  file: FileMetadataDTO;
}

export interface FileMetadataWebResponse {
  file: FileMetadataDTO;
}
