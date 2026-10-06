import { afterAll, beforeAll, beforeEach, describe, expect, it } from '@jest/globals';
import {
  EntityType,
  FileId,
  FileStatus,
  RejectionReason,
  ScanStatus,
  ValidationMode,
} from '../../index.js';
import { FileModel, ReleasedEntityModel } from '../../models/index.js';
import { closeTestDb, initializeTestDb, testDataSource, truncateAll } from '../data-source.js';
import { buildFileData } from '../factories/file.factory.js';

interface ColumnRow {
  column_name: string;
}

interface IndexRow {
  indexname: string;
  indexdef: string;
}

const dbColumns = async (table: string): Promise<string[]> => {
  const rows = await testDataSource.query<ColumnRow[]>(
    `SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1`,
    [table],
  );
  return rows.map((row) => row.column_name).sort();
};

const modelColumns = (model: typeof FileModel | typeof ReleasedEntityModel): string[] =>
  testDataSource
    .getMetadata(model)
    .columns.map((column) => column.databaseName)
    .sort();

describe('files and released_entities persistence (integration)', () => {
  beforeAll(async () => {
    await initializeTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await truncateAll();
  });

  describe('schema', () => {
    it('maps every column of the files table, and only those', async () => {
      expect(modelColumns(FileModel)).toEqual(await dbColumns('files'));
    });

    it('maps every column of the released_entities table, and only those', async () => {
      expect(modelColumns(ReleasedEntityModel)).toEqual(await dbColumns('released_entities'));
    });

    it('declares the indexes of the spec, the purge ones being partial', async () => {
      const indexes = await testDataSource.query<IndexRow[]>(
        `SELECT indexname, indexdef FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'files'`,
      );
      const byName = new Map(indexes.map((index) => [index.indexname, index.indexdef]));

      for (const name of ['idx_files_entity', 'idx_files_owner']) {
        expect(byName.get(name)).toBeDefined();
      }
      for (const name of [
        'idx_files_awaiting',
        'idx_files_scanning',
        'idx_files_unused',
        'idx_files_reserved',
        'idx_files_orphaned',
      ]) {
        expect(byName.get(name)).toContain('WHERE');
      }
    });

    it('declares the same indexes on the model as in the migration', () => {
      const modelIndexes = testDataSource
        .getMetadata(FileModel)
        .indices.map((index) => index.name)
        .sort();

      expect(modelIndexes).toEqual([
        'idx_files_awaiting',
        'idx_files_entity',
        'idx_files_orphaned',
        'idx_files_owner',
        'idx_files_reserved',
        'idx_files_scanning',
        'idx_files_unused',
      ]);
    });
  });

  describe('FileModel', () => {
    const repository = () => testDataSource.getRepository(FileModel);

    it('applies the database defaults on a minimal insert', async () => {
      const data = buildFileData();
      await repository().save(repository().create(data));

      const saved = await repository().findOneByOrFail({ id: data.id });

      expect(saved.status).toBe(FileStatus.PENDING);
      expect(saved.scanStatus).toBe(ScanStatus.AWAITING_UPLOAD);
      expect(saved.scanAttempts).toBe(0);
      expect(saved.entityId).toBeNull();
      expect(saved.rejectionReason).toBeNull();
      expect(saved.actualSize).toBeNull();
      expect(saved.publicKey).toBeNull();
      expect(saved.rescanScheduledAt).toBeNull();
      expect(saved.confirmedAt).toBeNull();
      expect(saved.scannedAt).toBeNull();
      expect(saved.reservedAt).toBeNull();
      expect(saved.attachedAt).toBeNull();
      expect(saved.createdAt).toBeInstanceOf(Date);
      expect(saved.updatedAt).toBeInstanceOf(Date);
    });

    it('reads bigint sizes back as numbers', async () => {
      const data = buildFileData({ declaredSize: 10 * 1024 * 1024, actualSize: 9_999_999 });
      await repository().save(repository().create(data));

      const saved = await repository().findOneByOrFail({ id: data.id });

      expect(saved.declaredSize).toBe(10 * 1024 * 1024);
      expect(saved.actualSize).toBe(9_999_999);
    });

    it('round-trips a fully populated row', async () => {
      const entityId = FileId.generate().getValue();
      const now = new Date('2026-10-06T10:00:00.000Z');
      const data = buildFileData({
        entityType: EntityType.EVENT_COVER,
        entityId,
        status: FileStatus.ORPHANED,
        scanStatus: ScanStatus.REJECTED,
        rejectionReason: RejectionReason.SCAN_TIMEOUT,
        publicKey: 'event-cover/public.webp',
        scanAttempts: 2,
        rescanScheduledAt: now,
        validationMode: ValidationMode.ASYNC,
        confirmedAt: now,
        scannedAt: now,
        reservedAt: now,
        attachedAt: now,
      });
      await repository().save(repository().create(data));

      const saved = await repository().findOneByOrFail({ id: data.id });

      expect(saved).toMatchObject({
        entityType: EntityType.EVENT_COVER,
        entityId,
        status: FileStatus.ORPHANED,
        scanStatus: ScanStatus.REJECTED,
        rejectionReason: RejectionReason.SCAN_TIMEOUT,
        publicKey: 'event-cover/public.webp',
        scanAttempts: 2,
        validationMode: ValidationMode.ASYNC,
      });
      expect(saved.rescanScheduledAt?.toISOString()).toBe(now.toISOString());
      expect(saved.attachedAt?.toISOString()).toBe(now.toISOString());
    });

    it('refreshes updated_at on update', async () => {
      const data = buildFileData();
      const created = await repository().save(repository().create(data));
      const initialUpdatedAt = created.updatedAt.getTime();

      await new Promise((resolve) => setTimeout(resolve, 20));
      await repository().update({ id: data.id }, { status: FileStatus.RESERVED });
      const updated = await repository().findOneByOrFail({ id: data.id });

      expect(updated.status).toBe(FileStatus.RESERVED);
      expect(updated.updatedAt.getTime()).toBeGreaterThan(initialUpdatedAt);
    });

    it('rejects a second row with the same id', async () => {
      const data = buildFileData();
      await repository().insert(repository().create(data));

      await expect(repository().insert(repository().create(data))).rejects.toThrow();
    });

    it('rejects a row without its NOT NULL columns', async () => {
      const incomplete = buildFileData({ quarantineKey: undefined });

      await expect(repository().insert(repository().create(incomplete))).rejects.toThrow();
    });
  });

  describe('ReleasedEntityModel', () => {
    const repository = () => testDataSource.getRepository(ReleasedEntityModel);

    it('defaults released_at on insert', async () => {
      const entityId = FileId.generate().getValue();
      await repository().insert({ entityType: EntityType.POST, entityId });

      const saved = await repository().findOneByOrFail({ entityType: EntityType.POST, entityId });

      expect(saved.releasedAt).toBeInstanceOf(Date);
    });

    it('uses (entity_type, entity_id) as primary key', async () => {
      const entityId = FileId.generate().getValue();
      await repository().insert({ entityType: EntityType.POST, entityId });

      await expect(
        repository().insert({ entityType: EntityType.POST, entityId }),
      ).rejects.toThrow();
      await expect(
        repository().insert({ entityType: EntityType.EVENT_COVER, entityId }),
      ).resolves.toBeDefined();
    });
  });
});
