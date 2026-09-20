import { EntityType } from '../enums/entity-type.enum.js';

export const COMMON_ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export const ALLOWED_MIME_TYPES_BY_ENTITY: Record<EntityType, readonly string[]> = {
  [EntityType.USER_AVATAR]: [...COMMON_ALLOWED_MIME_TYPES],
  [EntityType.POST]: [...COMMON_ALLOWED_MIME_TYPES],
  [EntityType.EVENT_COVER]: [...COMMON_ALLOWED_MIME_TYPES],
  [EntityType.BADGE_ICON]: [...COMMON_ALLOWED_MIME_TYPES, 'image/svg+xml'],
} as const;

export const GLOBAL_ALLOWED_MIME_TYPES: readonly string[] = Array.from(
  new Set(Object.values(ALLOWED_MIME_TYPES_BY_ENTITY).flat())
);

export type AllowedMimeType = (typeof GLOBAL_ALLOWED_MIME_TYPES)[number];
