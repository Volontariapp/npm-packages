import { BadRequestError } from '@volontariapp/errors';
import { describe, expect, it } from '@jest/globals';
import {
  EntityType,
  InvalidEntityTypeException,
  VALIDATION_POLICY_BY_ENTITY,
  buildPublicFileUrl,
  buildPublicObjectKey,
  buildQuarantineObjectKey,
} from '../index.js';

const FILE_ID = '3f2b8c1e-5d4a-4e7b-9a6c-1d2e3f4a5b6c';
const BASE_URL = 'https://cdn.volontariapp.com';

/** Asserts a typed 400 error carrying the expected business code. */
const expectBadRequest = (act: () => unknown, code: string): void => {
  expect(act).toThrow(BadRequestError);
  expect(act).toThrow(expect.objectContaining({ statusCode: 400, code }));
};

const EXPECTED_KEYS: readonly [EntityType, string][] = [
  [EntityType.POST, `post/${FILE_ID}.webp`],
  [EntityType.EVENT_COVER, `event-cover/${FILE_ID}.webp`],
  [EntityType.USER_AVATAR, `user-avatar/${FILE_ID}.webp`],
  [EntityType.BADGE_ICON, `badge-icon/${FILE_ID}.png`],
];

describe('Object key helpers', () => {
  describe('buildQuarantineObjectKey', () => {
    it('should prefix the file id with quarantine/', () => {
      expect(buildQuarantineObjectKey(FILE_ID)).toBe(`quarantine/${FILE_ID}`);
    });

    it('should build the same key for an uppercase file id', () => {
      expect(buildQuarantineObjectKey(FILE_ID.toUpperCase())).toBe(`quarantine/${FILE_ID}`);
    });

    it.each(['', 'not-a-uuid', '../etc/passwd', `${FILE_ID}/x`])(
      'should reject the invalid file id %p',
      (invalid) => {
        expectBadRequest(() => buildQuarantineObjectKey(invalid), 'INVALID_FILE_ID');
      },
    );
  });

  describe('buildPublicObjectKey', () => {
    it.each(EXPECTED_KEYS)('should build the key of %s', (entityType, expected) => {
      expect(buildPublicObjectKey(entityType, FILE_ID)).toBe(expected);
    });

    it('should use the output format of the validation policy as extension', () => {
      for (const entityType of Object.values(EntityType)) {
        const { format } = VALIDATION_POLICY_BY_ENTITY[entityType].output;
        expect(buildPublicObjectKey(entityType, FILE_ID).endsWith(`.${format}`)).toBe(true);
      }
    });

    it('should build the same key for an uppercase file id', () => {
      expect(buildPublicObjectKey(EntityType.POST, FILE_ID.toUpperCase())).toBe(
        `post/${FILE_ID}.webp`,
      );
    });

    it('should reject an invalid file id', () => {
      expectBadRequest(() => buildPublicObjectKey(EntityType.POST, 'nope'), 'INVALID_FILE_ID');
    });

    it('should reject an unknown entity type', () => {
      const act = (): string => buildPublicObjectKey('UNKNOWN' as EntityType, FILE_ID);

      expect(act).toThrow(InvalidEntityTypeException);
      expectBadRequest(act, 'INVALID_ENTITY_TYPE');
    });
  });

  describe('buildPublicFileUrl', () => {
    it.each(EXPECTED_KEYS)('should build the URL of %s', (entityType, key) => {
      expect(buildPublicFileUrl(entityType, FILE_ID, BASE_URL)).toBe(`${BASE_URL}/${key}`);
    });

    it('should ignore trailing slashes of the base URL', () => {
      const expected = `${BASE_URL}/post/${FILE_ID}.webp`;
      expect(buildPublicFileUrl(EntityType.POST, FILE_ID, `${BASE_URL}/`)).toBe(expected);
      expect(buildPublicFileUrl(EntityType.POST, FILE_ID, `${BASE_URL}///`)).toBe(expected);
    });

    it('should keep a path prefix in the base URL', () => {
      expect(buildPublicFileUrl(EntityType.BADGE_ICON, FILE_ID, 'http://localhost:9000/pub/')).toBe(
        `http://localhost:9000/pub/badge-icon/${FILE_ID}.png`,
      );
    });

    it.each(['', '   ', '/', '///'])('should reject the empty base URL %p', (baseUrl) => {
      expectBadRequest(
        () => buildPublicFileUrl(EntityType.POST, FILE_ID, baseUrl),
        'INVALID_PUBLIC_BASE_URL',
      );
    });

    it('should build the same URL for an uppercase file id', () => {
      expect(buildPublicFileUrl(EntityType.POST, FILE_ID.toUpperCase(), BASE_URL)).toBe(
        `${BASE_URL}/post/${FILE_ID}.webp`,
      );
    });

    it('should reject an invalid file id', () => {
      expectBadRequest(
        () => buildPublicFileUrl(EntityType.POST, 'nope', BASE_URL),
        'INVALID_FILE_ID',
      );
    });
  });
});
