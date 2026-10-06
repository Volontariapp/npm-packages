import { describe, expect, it } from '@jest/globals';
import {
  ALLOWED_MIME_TYPES_BY_ENTITY,
  EntityType,
  FileSizeNotAllowedException,
  ONE_MEGABYTE,
  TEN_MEGABYTES,
  VALIDATION_POLICY_BY_ENTITY,
  ValidationMode,
  resolveValidationMode,
} from '../index.js';

describe('Validation policy', () => {
  describe('VALIDATION_POLICY_BY_ENTITY', () => {
    it('should define the policy of every entity type', () => {
      expect(Object.keys(VALIDATION_POLICY_BY_ENTITY).sort()).toEqual(
        Object.values(EntityType).sort(),
      );
    });

    it.each([EntityType.USER_AVATAR, EntityType.BADGE_ICON])(
      '%s should be limited to 1 MB, SYNC only, one per entity',
      (entityType) => {
        const policy = VALIDATION_POLICY_BY_ENTITY[entityType];
        expect(policy.maxSizeBytes).toBe(ONE_MEGABYTE);
        expect(policy.syncMaxSizeBytes).toBe(ONE_MEGABYTE);
        expect(policy.asyncAllowed).toBe(false);
        expect(policy.maxPerEntity).toBe(1);
      },
    );

    it.each([EntityType.POST, EntityType.EVENT_COVER])(
      '%s should allow up to 10 MB with a 1 MB SYNC threshold',
      (entityType) => {
        const policy = VALIDATION_POLICY_BY_ENTITY[entityType];
        expect(policy.maxSizeBytes).toBe(TEN_MEGABYTES);
        expect(policy.syncMaxSizeBytes).toBe(ONE_MEGABYTE);
        expect(policy.asyncAllowed).toBe(true);
      },
    );

    it('should cap posts at 10 files and event covers at 1', () => {
      expect(VALIDATION_POLICY_BY_ENTITY[EntityType.POST].maxPerEntity).toBe(10);
      expect(VALIDATION_POLICY_BY_ENTITY[EntityType.EVENT_COVER].maxPerEntity).toBe(1);
    });

    it('should expose the output format of each entity', () => {
      expect(VALIDATION_POLICY_BY_ENTITY[EntityType.USER_AVATAR].output).toEqual({
        format: 'webp',
        width: 512,
        height: 512,
      });
      expect(VALIDATION_POLICY_BY_ENTITY[EntityType.BADGE_ICON].output).toEqual({
        format: 'png',
        width: 256,
        height: 256,
      });
      expect(VALIDATION_POLICY_BY_ENTITY[EntityType.POST].output).toEqual({
        format: 'webp',
        width: 2048,
        height: null,
      });
    });

    it('should reuse the allowed MIME types and never accept SVG', () => {
      for (const entityType of Object.values(EntityType)) {
        const policy = VALIDATION_POLICY_BY_ENTITY[entityType];
        expect(policy.allowedMimeTypes).toEqual(ALLOWED_MIME_TYPES_BY_ENTITY[entityType]);
        expect(policy.allowedMimeTypes).not.toContain('image/svg+xml');
      }
    });
  });

  describe('resolveValidationMode', () => {
    it.each(Object.values(EntityType))('%s: exactly 1 MB is SYNC', (entityType) => {
      expect(resolveValidationMode(entityType, ONE_MEGABYTE)).toBe(ValidationMode.SYNC);
    });

    it.each(Object.values(EntityType))('%s: 1 byte is SYNC', (entityType) => {
      expect(resolveValidationMode(entityType, 1)).toBe(ValidationMode.SYNC);
    });

    it.each([EntityType.POST, EntityType.EVENT_COVER])(
      '%s: 1 byte above the SYNC threshold is ASYNC',
      (entityType) => {
        expect(resolveValidationMode(entityType, ONE_MEGABYTE + 1)).toBe(ValidationMode.ASYNC);
      },
    );

    it.each([EntityType.POST, EntityType.EVENT_COVER])(
      '%s: exactly 10 MB is ASYNC',
      (entityType) => {
        expect(resolveValidationMode(entityType, TEN_MEGABYTES)).toBe(ValidationMode.ASYNC);
      },
    );

    it.each([EntityType.POST, EntityType.EVENT_COVER])(
      '%s: 1 byte above 10 MB is refused',
      (entityType) => {
        expect(() => resolveValidationMode(entityType, TEN_MEGABYTES + 1)).toThrow(
          FileSizeNotAllowedException,
        );
      },
    );

    it.each([EntityType.USER_AVATAR, EntityType.BADGE_ICON])(
      '%s: 1 byte above 1 MB is refused, ASYNC is not allowed',
      (entityType) => {
        expect(() => resolveValidationMode(entityType, ONE_MEGABYTE + 1)).toThrow(
          FileSizeNotAllowedException,
        );
      },
    );

    it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
      'should refuse the invalid declared size %p',
      (declaredSize) => {
        expect(() => resolveValidationMode(EntityType.POST, declaredSize)).toThrow(
          FileSizeNotAllowedException,
        );
      },
    );

    it('should report the exceeded limit in the exception', () => {
      expect.assertions(4);
      try {
        resolveValidationMode(EntityType.USER_AVATAR, ONE_MEGABYTE + 1);
      } catch (error) {
        expect(error).toBeInstanceOf(FileSizeNotAllowedException);
        if (error instanceof FileSizeNotAllowedException) {
          expect(error.statusCode).toBe(400);
          expect(error.code).toBe('FILE_SIZE_NOT_ALLOWED');
          expect(error.message).toContain('USER_AVATAR');
        }
      }
    });
  });
});
