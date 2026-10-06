import { describe, expect, it } from '@jest/globals';
import {
  EntityType,
  FileEntity,
  FileId,
  FileSizeNotAllowedException,
  FileStatus,
  InvalidEntityTypeException,
  InvalidFileExtensionException,
  ReleasedEntityEntity,
  ScanStatus,
  UPLOAD_EXPIRY_GRACE_MS,
  ValidationMode,
} from '../index.js';
import { buildNewFileData, PRESIGNED_URL_TTL_SECONDS } from './factories/file-entity.factory.js';

const ONE_MEGABYTE = 1024 * 1024;

describe('FileEntity.create', () => {
  it('declares a PENDING file awaiting its upload, with empty nullable fields', () => {
    const file = FileEntity.create(buildNewFileData());

    expect(file.status).toBe(FileStatus.PENDING);
    expect(file.scanStatus).toBe(ScanStatus.AWAITING_UPLOAD);
    expect(file.scanAttempts).toBe(0);
    expect(file.entityId).toBeNull();
    expect(file.rejectionReason).toBeNull();
    expect(file.actualSize).toBeNull();
    expect(file.publicKey).toBeNull();
    expect(file.rescanScheduledAt).toBeNull();
    expect(file.confirmedAt).toBeNull();
    expect(file.scannedAt).toBeNull();
    expect(file.reservedAt).toBeNull();
    expect(file.attachedAt).toBeNull();
  });

  it('generates a UUID v4 when no id is given and normalizes a given one to lowercase', () => {
    const generated = FileEntity.create(buildNewFileData());
    expect(() => FileId.create(generated.id)).not.toThrow();

    const upper = FileId.generate().getValue().toUpperCase();
    const file = FileEntity.create(buildNewFileData({ id: upper }));
    expect(file.id).toBe(upper.toLowerCase());
  });

  it('rejects an id that is not a UUID v4', () => {
    expect(() => FileEntity.create(buildNewFileData({ id: 'not-a-uuid' }))).toThrow();
  });

  it('derives the quarantine key from the id', () => {
    const file = FileEntity.create(buildNewFileData());
    expect(file.quarantineKey).toBe(`quarantine/${file.id}`);
  });

  it('normalizes the MIME type', () => {
    const file = FileEntity.create(buildNewFileData({ declaredMimeType: ' IMAGE/PNG ' }));
    expect(file.declaredMimeType).toBe('image/png');
  });

  it('computes the upload deadline as creation + presigned TTL + the 5 minute grace', () => {
    const now = new Date('2026-10-07T10:00:00.000Z');
    const file = FileEntity.create(buildNewFileData({ now }));

    expect(file.createdAt).toEqual(now);
    expect(file.updatedAt).toEqual(now);
    expect(file.uploadExpiresAt.getTime()).toBe(
      now.getTime() + PRESIGNED_URL_TTL_SECONDS * 1000 + UPLOAD_EXPIRY_GRACE_MS,
    );
  });

  describe('validation mode, chosen from the declared size', () => {
    it('is SYNC up to the synchronous threshold', () => {
      const file = FileEntity.create(buildNewFileData({ declaredSize: ONE_MEGABYTE }));
      expect(file.validationMode).toBe(ValidationMode.SYNC);
    });

    it('is ASYNC above it when the entity allows it', () => {
      const file = FileEntity.create(buildNewFileData({ declaredSize: ONE_MEGABYTE + 1 }));
      expect(file.validationMode).toBe(ValidationMode.ASYNC);
    });

    it('is refused above it when the entity is SYNC only', () => {
      expect(() =>
        FileEntity.create(
          buildNewFileData({ entityType: EntityType.USER_AVATAR, declaredSize: ONE_MEGABYTE + 1 }),
        ),
      ).toThrow(FileSizeNotAllowedException);
    });

    it.each([0, -1, 1.5, Number.NaN])('refuses the declared size %s', (declaredSize) => {
      expect(() => FileEntity.create(buildNewFileData({ declaredSize }))).toThrow(
        FileSizeNotAllowedException,
      );
    });

    it('refuses a size above the maximum of the entity', () => {
      expect(() =>
        FileEntity.create(buildNewFileData({ declaredSize: 10 * ONE_MEGABYTE + 1 })),
      ).toThrow(FileSizeNotAllowedException);
    });
  });

  describe('refusals', () => {
    it('refuses a MIME type the entity does not allow', () => {
      expect(() => FileEntity.create(buildNewFileData({ declaredMimeType: 'image/svg+xml' }))).toThrow(
        InvalidFileExtensionException,
      );
      expect(() => FileEntity.create(buildNewFileData({ declaredMimeType: '' }))).toThrow(
        InvalidFileExtensionException,
      );
    });

    it('refuses an unknown entity type before looking at the MIME type', () => {
      expect(() =>
        FileEntity.create(
          buildNewFileData({ entityType: 'toString' as EntityType, declaredMimeType: 'text/plain' }),
        ),
      ).toThrow(InvalidEntityTypeException);
    });

    it('refuses a blank owner', () => {
      expect(() => FileEntity.create(buildNewFileData({ ownerId: '  ' }))).toThrow(
        'File owner must not be empty',
      );
    });

    it.each([0, -5, Number.NaN, Number.POSITIVE_INFINITY])(
      'refuses the presigned URL lifetime %s',
      (presignedUrlTtlSeconds) => {
        expect(() => FileEntity.create(buildNewFileData({ presignedUrlTtlSeconds }))).toThrow(
          'Presigned URL lifetime must be a positive number of seconds',
        );
      },
    );
  });
});

describe('ReleasedEntityEntity.create', () => {
  it('builds a tombstone with the given release date', () => {
    const releasedAt = new Date('2026-10-07T10:00:00.000Z');
    const entityId = FileId.generate().getValue();

    const released = ReleasedEntityEntity.create({
      entityType: EntityType.POST,
      entityId,
      releasedAt,
    });

    expect(released.entityType).toBe(EntityType.POST);
    expect(released.entityId).toBe(entityId);
    expect(released.releasedAt).toEqual(releasedAt);
  });

  it('defaults the release date to now', () => {
    const before = Date.now();
    const released = ReleasedEntityEntity.create({
      entityType: EntityType.POST,
      entityId: FileId.generate().getValue(),
    });
    expect(released.releasedAt.getTime()).toBeGreaterThanOrEqual(before);
  });

  it('refuses an unknown entity type and a blank entity id', () => {
    expect(() =>
      ReleasedEntityEntity.create({ entityType: 'nope' as EntityType, entityId: 'x' }),
    ).toThrow(InvalidEntityTypeException);
    expect(() =>
      ReleasedEntityEntity.create({ entityType: EntityType.POST, entityId: ' ' }),
    ).toThrow('Released entity id must not be empty');
  });
});
