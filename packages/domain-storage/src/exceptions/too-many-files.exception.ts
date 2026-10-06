import { BadRequestError } from '@volontariapp/errors';
import type { EntityType } from '../enums/entity-type.enum.js';

export class TooManyFilesException extends BadRequestError {
  constructor(entityType: EntityType, count: number, maxPerEntity: number) {
    super(
      `${String(count)} files exceed the limit of ${String(maxPerEntity)} for entity type '${entityType}'.`,
      'TOO_MANY_FILES',
      { entityType, count, maxPerEntity },
    );
  }
}
