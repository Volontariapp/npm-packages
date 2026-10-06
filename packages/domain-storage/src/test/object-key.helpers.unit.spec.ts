import { describe, expect, it } from '@jest/globals';
import {
  EntityType,
  VALIDATION_POLICY_BY_ENTITY,
  buildPublicFileUrl,
  buildPublicObjectKey,
  buildQuarantineObjectKey,
} from '../index.js';

const FILE_ID = '3f2b8c1e-5d4a-4e7b-9a6c-1d2e3f4a5b6c';
const BASE_URL = 'https://cdn.volontariapp.com';

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

    it('should be deterministic', () => {
      expect(buildQuarantineObjectKey(FILE_ID)).toBe(buildQuarantineObjectKey(FILE_ID));
    });

    it.each(['', 'not-a-uuid', '../etc/passwd', `${FILE_ID}/x`])(
      'should reject the invalid file id %p',
      (invalid) => {
        expect(() => buildQuarantineObjectKey(invalid)).toThrow();
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

    it('should be deterministic', () => {
      expect(buildPublicObjectKey(EntityType.POST, FILE_ID)).toBe(
        buildPublicObjectKey(EntityType.POST, FILE_ID),
      );
    });

    it('should reject an invalid file id', () => {
      expect(() => buildPublicObjectKey(EntityType.POST, 'nope')).toThrow();
    });

    it('should reject an unknown entity type', () => {
      expect(() => buildPublicObjectKey('UNKNOWN' as EntityType, FILE_ID)).toThrow();
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

    it('should be deterministic', () => {
      expect(buildPublicFileUrl(EntityType.POST, FILE_ID, BASE_URL)).toBe(
        buildPublicFileUrl(EntityType.POST, FILE_ID, BASE_URL),
      );
    });

    it.each(['', '   ', '/', '///'])('should reject the empty base URL %p', (baseUrl) => {
      expect(() => buildPublicFileUrl(EntityType.POST, FILE_ID, baseUrl)).toThrow();
    });

    it('should reject an invalid file id', () => {
      expect(() => buildPublicFileUrl(EntityType.POST, 'nope', BASE_URL)).toThrow();
    });
  });
});
