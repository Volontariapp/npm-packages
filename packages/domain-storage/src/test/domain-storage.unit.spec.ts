import { describe, expect, it } from '@jest/globals';
import {
  EntityType,
  FileId,
  FileNotFoundException,
  FileStatus,
  InvalidFileExtensionException,
  MimeType,
  COMMON_ALLOWED_MIME_TYPES,
  GLOBAL_ALLOWED_MIME_TYPES,
  ALLOWED_MIME_TYPES_BY_ENTITY,
} from '../index.js';

describe('Domain Storage Unit Tests', () => {
  describe('Enums', () => {
    it('should contain expected FileStatus values', () => {
      expect(FileStatus.PENDING).toBe('PENDING');
      expect(FileStatus.ATTACHED).toBe('ATTACHED');
      expect(FileStatus.ORPHANED).toBe('ORPHANED');
      expect(FileStatus.DELETED).toBe('DELETED');
    });

    it('should contain expected EntityType values', () => {
      expect(EntityType.POST).toBe('POST');
      expect(EntityType.USER_AVATAR).toBe('USER_AVATAR');
      expect(EntityType.BADGE_ICON).toBe('BADGE_ICON');
      expect(EntityType.EVENT_COVER).toBe('EVENT_COVER');
    });
  });

  describe('FileId Value Object', () => {
    it('should create a valid FileId from UUID v4 string', () => {
      const validUuid = '123e4567-e89b-42d3-a456-426614174000';
      const fileId = FileId.create(validUuid);
      expect(fileId.getValue()).toBe(validUuid);
    });

    it('should generate a valid FileId', () => {
      const fileId = FileId.generate();
      expect(fileId.getValue()).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
    });

    it('should throw error for invalid UUID v4 format', () => {
      expect(() => FileId.create('invalid-uuid')).toThrow();
      expect(() => FileId.create('')).toThrow();
    });

    it('should verify equality of FileId instances', () => {
      const uuid = '123e4567-e89b-42d3-a456-426614174000';
      const fileId1 = FileId.create(uuid);
      const fileId2 = FileId.create(uuid);
      const fileId3 = FileId.generate();

      expect(fileId1.equals(fileId2)).toBe(true);
      expect(fileId1.equals(fileId3)).toBe(false);
    });
  });

  describe('MimeType Value Object & Constants', () => {
    it('should define correct common and entity allowed MIME types', () => {
      expect(COMMON_ALLOWED_MIME_TYPES).toContain('image/jpeg');
      expect(COMMON_ALLOWED_MIME_TYPES).toContain('image/png');
      expect(COMMON_ALLOWED_MIME_TYPES).toContain('image/webp');

      expect(ALLOWED_MIME_TYPES_BY_ENTITY.BADGE_ICON).toContain('image/svg+xml');
      expect(ALLOWED_MIME_TYPES_BY_ENTITY.USER_AVATAR).not.toContain('image/svg+xml');
      expect(GLOBAL_ALLOWED_MIME_TYPES).toContain('image/svg+xml');
    });

    it('should create valid MimeType without entityType', () => {
      const mime = MimeType.create('IMAGE/JPEG ');
      expect(mime.getValue()).toBe('image/jpeg');
    });

    it('should create valid MimeType for entityType', () => {
      const mime = MimeType.create('image/svg+xml', EntityType.BADGE_ICON);
      expect(mime.getValue()).toBe('image/svg+xml');
    });

    it('should throw InvalidFileExtensionException when MIME type is not allowed for entity', () => {
      expect(() =>
        MimeType.create('image/svg+xml', EntityType.USER_AVATAR),
      ).toThrow(InvalidFileExtensionException);
    });

    it('should throw InvalidFileExtensionException for unsupported global MIME type', () => {
      expect(() => MimeType.create('application/exe')).toThrow(
        InvalidFileExtensionException,
      );
    });

    it('should verify equality of MimeType instances', () => {
      const mime1 = MimeType.create('image/png');
      const mime2 = MimeType.create('IMAGE/PNG');
      const mime3 = MimeType.create('image/webp');

      expect(mime1.equals(mime2)).toBe(true);
      expect(mime1.equals(mime3)).toBe(false);
    });
  });

  describe('Exceptions', () => {
    it('should create FileNotFoundException with correct properties', () => {
      const fileId = '123e4567-e89b-42d3-a456-426614174000';
      const exc = new FileNotFoundException(fileId);

      expect(exc.statusCode).toBe(404);
      expect(exc.code).toBe('FILE_NOT_FOUND');
      expect(exc.message).toContain(fileId);
    });

    it('should create InvalidFileExtensionException with correct properties', () => {
      const exc = new InvalidFileExtensionException('application/x-sh', EntityType.POST);

      expect(exc.statusCode).toBe(400);
      expect(exc.code).toBe('INVALID_FILE_EXTENSION');
      expect(exc.message).toContain('application/x-sh');
      expect(exc.message).toContain('POST');
    });
  });
});
