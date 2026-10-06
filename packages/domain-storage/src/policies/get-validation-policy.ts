import type { EntityType } from '../enums/entity-type.enum.js';
import { InvalidEntityTypeException } from '../exceptions/invalid-entity-type.exception.js';
import { VALIDATION_POLICY_BY_ENTITY } from './validation-policy.constants.js';
import type { ValidationPolicy } from './validation-policy.constants.js';

/**
 * Single entry point to read a policy: a value that is not an `EntityType`
 * (plain string from a request, inherited key such as `toString`) raises
 * `InvalidEntityTypeException` instead of a `TypeError`.
 */
export function getValidationPolicy(entityType: EntityType): ValidationPolicy {
  if (!Object.hasOwn(VALIDATION_POLICY_BY_ENTITY, entityType)) {
    throw new InvalidEntityTypeException(entityType);
  }
  return VALIDATION_POLICY_BY_ENTITY[entityType];
}
