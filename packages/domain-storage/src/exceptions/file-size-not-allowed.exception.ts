import { BadRequestError } from '@volontariapp/errors';
import type { EntityType } from '../enums/entity-type.enum.js';

export class FileSizeNotAllowedException extends BadRequestError {
  constructor(entityType: EntityType | string, declaredSizeBytes: number, limitBytes?: number) {
    const declared = String(declaredSizeBytes);
    const message =
      limitBytes === undefined
        ? `Declared size '${declared}' is not a valid file size.`
        : `Declared size '${declared}' bytes exceeds the limit of '${String(limitBytes)}' bytes for entity type '${entityType}'.`;

    super(message, 'FILE_SIZE_NOT_ALLOWED', { entityType, declaredSizeBytes, limitBytes });
  }
}
