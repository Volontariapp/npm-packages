import type {
  GenerateUploadUrlCommand,
  ConfirmUploadCommand,
} from '../../../storage/storage.command.js';
import type { GetFileMetadataQuery } from '../../../storage/storage.query.js';

/**
 * Public request to declare a file and obtain a presigned upload POST.
 * The deprecated isPublic flag is not exposed: visibility is derived from the scan result.
 */
export interface GenerateUploadUrlRequest extends Omit<GenerateUploadUrlCommand, 'isPublic'> {}

/**
 * Public request to confirm that a file has been uploaded.
 * fileId comes from @Param(:id).
 */
export interface ConfirmUploadRequest extends ConfirmUploadCommand {}

/**
 * Public request to read the metadata of a file.
 * fileId comes from @Param(:id).
 */
export interface GetFileMetadataRequest extends GetFileMetadataQuery {}
