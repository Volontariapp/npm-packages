import { BadRequestError } from '@volontariapp/errors';
import { EntityType } from '../enums/entity-type.enum.js';

export class InvalidFileExtensionException extends BadRequestError {
  constructor(mimeType: string, entityType?: EntityType | string) {
    const message = entityType
      ? `MIME type '${mimeType}' is not allowed for entity type '${entityType}'.`
      : `MIME type '${mimeType}' is not allowed.`;

    super(message, 'INVALID_FILE_EXTENSION', { mimeType, entityType });
  }
}
