import { NotFoundError } from '@volontariapp/errors';

export class FileNotFoundException extends NotFoundError {
  constructor(fileId: string) {
    super(`File with ID '${fileId}' was not found.`, 'FILE_NOT_FOUND', { fileId });
  }
}
