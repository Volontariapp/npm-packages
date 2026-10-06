import { BadRequestError } from '@volontariapp/errors';
import type { EntityType } from '../enums/entity-type.enum.js';
import { getValidationPolicy } from '../policies/get-validation-policy.js';

/**
 * Tombstone written when the files of a business entity are released, so that a late
 * attachment event for the same entity is recognised and ignored (table `released_entities`).
 * Written and read by `releaseForEntity` / `attachFromConfirmationEvent` (ticket 1.11).
 */
export class ReleasedEntityEntity {
  entityType!: EntityType;
  entityId!: string;
  releasedAt!: Date;

  /** Throws `InvalidEntityTypeException` for an unknown entity type, `BadRequestError` for a blank id. */
  static create(data: {
    entityType: EntityType;
    entityId: string;
    releasedAt?: Date;
  }): ReleasedEntityEntity {
    getValidationPolicy(data.entityType);
    if (typeof data.entityId !== 'string' || data.entityId.trim() === '') {
      throw new BadRequestError('Released entity id must not be empty', 'INVALID_ENTITY_ID', {
        entityId: data.entityId,
      });
    }

    const released = new ReleasedEntityEntity();
    released.entityType = data.entityType;
    released.entityId = data.entityId;
    released.releasedAt = data.releasedAt ?? new Date();
    return released;
  }
}
