import { BadRequestError } from '@volontariapp/errors';

export class InvalidEntityTypeException extends BadRequestError {
  constructor(entityType: string) {
    super(`Unknown entity type: '${entityType}'`, 'INVALID_ENTITY_TYPE', { entityType });
  }
}
