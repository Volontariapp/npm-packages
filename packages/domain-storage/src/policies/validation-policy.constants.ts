import { EntityType } from '../enums/entity-type.enum.js';
import { ALLOWED_MIME_TYPES_BY_ENTITY } from '../value-objects/mime-type.constants.js';

export const ONE_MEGABYTE = 1024 * 1024;
export const TEN_MEGABYTES = 10 * ONE_MEGABYTE;

export type OutputImageFormat = 'webp' | 'png';

export interface OutputPolicy {
  readonly format: OutputImageFormat;
  readonly width: number;
  /** `null` keeps the aspect ratio: `width` is then a maximum width. */
  readonly height: number | null;
}

export interface ValidationPolicy {
  readonly maxSizeBytes: number;
  /** Declared sizes up to this threshold are processed synchronously. */
  readonly syncMaxSizeBytes: number;
  readonly asyncAllowed: boolean;
  readonly allowedMimeTypes: readonly string[];
  readonly output: OutputPolicy;
  readonly maxPerEntity: number;
}

export const VALIDATION_POLICY_BY_ENTITY: Readonly<Record<EntityType, ValidationPolicy>> = {
  [EntityType.USER_AVATAR]: {
    maxSizeBytes: ONE_MEGABYTE,
    syncMaxSizeBytes: ONE_MEGABYTE,
    asyncAllowed: false,
    allowedMimeTypes: ALLOWED_MIME_TYPES_BY_ENTITY[EntityType.USER_AVATAR],
    output: { format: 'webp', width: 512, height: 512 },
    maxPerEntity: 1,
  },
  [EntityType.BADGE_ICON]: {
    maxSizeBytes: ONE_MEGABYTE,
    syncMaxSizeBytes: ONE_MEGABYTE,
    asyncAllowed: false,
    allowedMimeTypes: ALLOWED_MIME_TYPES_BY_ENTITY[EntityType.BADGE_ICON],
    output: { format: 'png', width: 256, height: 256 },
    maxPerEntity: 1,
  },
  [EntityType.POST]: {
    maxSizeBytes: TEN_MEGABYTES,
    syncMaxSizeBytes: ONE_MEGABYTE,
    asyncAllowed: true,
    allowedMimeTypes: ALLOWED_MIME_TYPES_BY_ENTITY[EntityType.POST],
    output: { format: 'webp', width: 2048, height: null },
    maxPerEntity: 10,
  },
  [EntityType.EVENT_COVER]: {
    maxSizeBytes: TEN_MEGABYTES,
    syncMaxSizeBytes: ONE_MEGABYTE,
    asyncAllowed: true,
    allowedMimeTypes: ALLOWED_MIME_TYPES_BY_ENTITY[EntityType.EVENT_COVER],
    output: { format: 'webp', width: 2048, height: null },
    maxPerEntity: 1,
  },
};
