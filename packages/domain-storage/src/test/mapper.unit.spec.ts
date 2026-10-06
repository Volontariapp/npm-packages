import { beforeAll, describe, expect, it } from '@jest/globals';
import { databaseMapper } from '@volontariapp/database';
import { EntityType } from '../enums/entity-type.enum.js';
import { FileStatus } from '../enums/file-status.enum.js';
import { RejectionReason } from '../enums/rejection-reason.enum.js';
import { ScanStatus } from '../enums/scan-status.enum.js';
import { ValidationMode } from '../enums/validation-mode.enum.js';
import { FileEntity } from '../entities/file.entity.js';
import { ReleasedEntityEntity } from '../entities/released-entity.entity.js';
import { FileModel } from '../models/file.model.js';
import { ReleasedEntityModel } from '../models/released-entity.model.js';
import { registerStorageMappings } from '../models/mapper.js';
import { buildFileEntity } from './factories/file-entity.factory.js';

const FILE_FIELDS = [
  'id',
  'ownerId',
  'entityType',
  'entityId',
  'status',
  'scanStatus',
  'rejectionReason',
  'declaredMimeType',
  'declaredSize',
  'actualSize',
  'quarantineKey',
  'publicKey',
  'scanAttempts',
  'rescanScheduledAt',
  'validationMode',
  'uploadExpiresAt',
  'confirmedAt',
  'scannedAt',
  'reservedAt',
  'attachedAt',
  'createdAt',
  'updatedAt',
] as const;

describe('registerStorageMappings', () => {
  beforeAll(() => {
    registerStorageMappings();
  });

  it('registers both directions for files and released entities', () => {
    expect(databaseMapper.has(FileEntity, FileModel)).toBe(true);
    expect(databaseMapper.has(FileModel, FileEntity)).toBe(true);
    expect(databaseMapper.has(ReleasedEntityEntity, ReleasedEntityModel)).toBe(true);
    expect(databaseMapper.has(ReleasedEntityModel, ReleasedEntityEntity)).toBe(true);
  });

  it('is idempotent', () => {
    expect(() => {
      registerStorageMappings();
      registerStorageMappings();
    }).not.toThrow();
    expect(databaseMapper.has(FileEntity, FileModel)).toBe(true);
  });

  describe('FileEntity and FileModel', () => {
    it('maps every field of a freshly declared file, nullables included', () => {
      const entity = buildFileEntity();

      const model = databaseMapper.map(entity, FileEntity, FileModel);

      expect(model).toBeInstanceOf(FileModel);
      for (const field of FILE_FIELDS) {
        expect(model[field]).toEqual(entity[field]);
      }
      expect(model.entityId).toBeNull();
      expect(model.actualSize).toBeNull();
    });

    it('round-trips model to entity to model with a fully populated row', () => {
      const date = (day: number): Date => new Date(`2026-10-0${String(day)}T10:00:00.000Z`);
      const model = new FileModel();
      Object.assign(model, {
        id: 'f0f0f0f0-f0f0-4f0f-8f0f-f0f0f0f0f0f0',
        ownerId: 'a0a0a0a0-a0a0-4a0a-8a0a-a0a0a0a0a0a0',
        entityType: EntityType.POST,
        entityId: 'b0b0b0b0-b0b0-4b0b-8b0b-b0b0b0b0b0b0',
        status: FileStatus.ATTACHED,
        scanStatus: ScanStatus.REJECTED,
        rejectionReason: RejectionReason.MALWARE,
        declaredMimeType: 'image/webp',
        declaredSize: 2_500_000,
        actualSize: 2_400_000,
        quarantineKey: 'quarantine/f0f0f0f0-f0f0-4f0f-8f0f-f0f0f0f0f0f0',
        publicKey: 'post/f0f0f0f0-f0f0-4f0f-8f0f-f0f0f0f0f0f0.webp',
        scanAttempts: 2,
        rescanScheduledAt: date(2),
        validationMode: ValidationMode.ASYNC,
        uploadExpiresAt: date(3),
        confirmedAt: date(4),
        scannedAt: date(5),
        reservedAt: date(6),
        attachedAt: date(7),
        createdAt: date(1),
        updatedAt: date(8),
      } satisfies Partial<FileModel>);

      const entity = databaseMapper.map(model, FileModel, FileEntity);
      const back = databaseMapper.map(entity, FileEntity, FileModel);

      expect(entity).toBeInstanceOf(FileEntity);
      expect(entity.declaredSize).toBe(2_500_000);
      expect(typeof entity.actualSize).toBe('number');
      expect(entity.createdAt).toBeInstanceOf(Date);
      expect(entity.attachedAt).toEqual(date(7));
      expect(entity.scanStatus).toBe(ScanStatus.REJECTED);
      expect(entity.rejectionReason).toBe(RejectionReason.MALWARE);
      for (const field of FILE_FIELDS) {
        expect(back[field]).toEqual(model[field]);
      }
    });

    it('keeps null as null and does not turn it into undefined', () => {
      const model = new FileModel();
      Object.assign(model, buildFileEntity());

      const entity = databaseMapper.map(model, FileModel, FileEntity);

      expect(entity.rejectionReason).toBeNull();
      expect(entity.publicKey).toBeNull();
      expect(entity.rescanScheduledAt).toBeNull();
    });
  });

  describe('ReleasedEntityEntity and ReleasedEntityModel', () => {
    it('round-trips a tombstone', () => {
      const released = ReleasedEntityEntity.create({
        entityType: EntityType.EVENT_COVER,
        entityId: 'b0b0b0b0-b0b0-4b0b-8b0b-b0b0b0b0b0b0',
        releasedAt: new Date('2026-10-07T10:00:00.000Z'),
      });

      const model = databaseMapper.map(released, ReleasedEntityEntity, ReleasedEntityModel);
      const back = databaseMapper.map(model, ReleasedEntityModel, ReleasedEntityEntity);

      expect(model).toBeInstanceOf(ReleasedEntityModel);
      expect(model.entityType).toBe(EntityType.EVENT_COVER);
      expect(back).toBeInstanceOf(ReleasedEntityEntity);
      expect(back).toEqual(released);
    });
  });
});
