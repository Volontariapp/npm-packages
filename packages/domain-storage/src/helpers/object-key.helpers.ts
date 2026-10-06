import { BadRequestError } from '@volontariapp/errors';
import type { EntityType } from '../enums/entity-type.enum.js';
import { getValidationPolicy } from '../policies/get-validation-policy.js';
import { FileId } from '../value-objects/file-id.vo.js';

export const QUARANTINE_KEY_PREFIX = 'quarantine';

function resolveFileId(fileId: string): string {
  return FileId.create(fileId).getValue();
}

/** `USER_AVATAR` becomes `user-avatar`, the folder of the public bucket. */
function toEntityFolder(entityType: EntityType): string {
  return entityType.toLowerCase().replaceAll('_', '-');
}

/** Key of an upload in the quarantine bucket: `quarantine/{fileId}`. */
export function buildQuarantineObjectKey(fileId: string): string {
  return `${QUARANTINE_KEY_PREFIX}/${resolveFileId(fileId)}`;
}

/**
 * Key of a processed file in the public bucket: `{entity-type}/{fileId}.{ext}`.
 * The extension is the output format of the entity validation policy.
 */
export function buildPublicObjectKey(entityType: EntityType, fileId: string): string {
  const { format } = getValidationPolicy(entityType).output;
  const folder = toEntityFolder(entityType);
  return `${folder}/${resolveFileId(fileId)}.${format}`;
}

/**
 * Public URL of a processed file: `{baseUrl}/{entity-type}/{fileId}.{ext}`.
 * Trailing slashes of `baseUrl` are ignored. Pure computation, no network call.
 */
export function buildPublicFileUrl(
  entityType: EntityType,
  fileId: string,
  baseUrl: string,
): string {
  const normalizedBaseUrl = typeof baseUrl === 'string' ? baseUrl.trim().replace(/\/+$/, '') : '';
  if (normalizedBaseUrl === '') {
    throw new BadRequestError('Public base URL must not be empty', 'INVALID_PUBLIC_BASE_URL', {
      baseUrl,
    });
  }
  return `${normalizedBaseUrl}/${buildPublicObjectKey(entityType, fileId)}`;
}
