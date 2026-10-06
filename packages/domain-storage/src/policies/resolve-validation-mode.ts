import type { EntityType } from '../enums/entity-type.enum.js';
import { ValidationMode } from '../enums/validation-mode.enum.js';
import { FileSizeNotAllowedException } from '../exceptions/file-size-not-allowed.exception.js';
import { getValidationPolicy } from './get-validation-policy.js';

/**
 * Picks the processing mode from the declared size, never from the client.
 *
 * - declared size above `maxSizeBytes`: refused
 * - declared size up to `syncMaxSizeBytes`: SYNC
 * - otherwise ASYNC if the entity allows it, refused if not
 */
export function resolveValidationMode(
  entityType: EntityType,
  declaredSizeBytes: number,
): ValidationMode {
  if (!Number.isSafeInteger(declaredSizeBytes) || declaredSizeBytes <= 0) {
    throw new FileSizeNotAllowedException(entityType, declaredSizeBytes);
  }

  const policy = getValidationPolicy(entityType);

  if (declaredSizeBytes > policy.maxSizeBytes) {
    throw new FileSizeNotAllowedException(entityType, declaredSizeBytes, policy.maxSizeBytes);
  }

  if (declaredSizeBytes <= policy.syncMaxSizeBytes) {
    return ValidationMode.SYNC;
  }

  if (policy.asyncAllowed) {
    return ValidationMode.ASYNC;
  }

  throw new FileSizeNotAllowedException(entityType, declaredSizeBytes, policy.syncMaxSizeBytes);
}
