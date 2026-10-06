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

interface SpecIndex {
  columns: string;
  /** Postgres normalized form of the WHERE clause; `undefined` for a full index. */
  predicate?: string;
}

/** Section 8 of docs/stockage-fichiers/08-contrats-et-evolutions.md, as `pg_indexes.indexdef` prints it. */
const SPEC_INDEXES: Readonly<Record<string, SpecIndex>> = {
  idx_files_entity: { columns: 'entity_type, entity_id' },
  idx_files_owner: { columns: 'owner_id' },
  idx_files_awaiting: {
    columns: 'upload_expires_at',
    predicate: "((scan_status)::text = 'AWAITING_UPLOAD'::text)",
  },
  idx_files_scanning: {
    columns: 'confirmed_at',
    predicate: "((scan_status)::text = 'SCANNING'::text)",
  },
  idx_files_unused: { columns: 'confirmed_at', predicate: "((status)::text = 'PENDING'::text)" },
  idx_files_reserved: { columns: 'reserved_at', predicate: "((status)::text = 'RESERVED'::text)" },
  idx_files_orphaned: { columns: 'updated_at', predicate: "((status)::text = 'ORPHANED'::text)" },
};

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

    it('declares the indexes of the spec (docs/stockage-fichiers/08-contrats-et-evolutions.md, section 8)', async () => {
      const indexes = await testDataSource.query<IndexRow[]>(
        `SELECT indexname, indexdef FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'files' AND indexname LIKE 'idx_files_%'`,
      );
      const actual = new Map(
        indexes.map((index) => {
          const [, columns = '', predicate] =
            /\((?<columns>[^)]*)\)(?: WHERE (?<predicate>.*))?$/.exec(index.indexdef) ?? [];
          return [index.indexname, { columns, predicate }] as const;
        }),
      );

      expect([...actual.keys()].sort()).toEqual(Object.keys(SPEC_INDEXES).sort());
      for (const [name, expected] of Object.entries(SPEC_INDEXES)) {
        expect({ name, ...actual.get(name) }).toEqual({ name, ...expected });
      }
    });

    it('declares the same indexes on the model as in the spec', () => {
      const modelIndexes = testDataSource.getMetadata(FileModel).indices;

      expect(modelIndexes.map((index) => index.name).sort()).toEqual(
        Object.keys(SPEC_INDEXES).sort(),
      );
      for (const index of modelIndexes) {
        expect(Boolean(index.where)).toBe(SPEC_INDEXES[index.name].predicate !== undefined);
      }
    });

    /**
     * The model is mapped by hand and the schema comes from a separate migration:
     * TypeORM must have nothing left to create or alter to turn the migrated
     * database into the model schema. Observed on PostgreSQL 16 with a database
     * built from the migration: no false positive (varchar columns, bigint,
     * timestamptz and partial indexes all compare equal), so the assertion is
     * kept strict. If a TypeORM upgrade introduces a harmless difference
     * (for example `character varying` versus `varchar`), narrow the filter
     * here rather than dropping the check.
     */
    it('does not drift between the model and the migrated database', async () => {
      const sqlInMemory = await testDataSource.driver.createSchemaBuilder().log();
      // `event_queue` and `jobs_outbox` come from the common migrations of the other services:
      // their schema is owned by `@volontariapp/database`, not by this package.
      const ownQueries = sqlInMemory.upQueries
        .map((query) => query.query)
        .filter((query) => !/event_queue|jobs_outbox/.test(query));

      expect(ownQueries).toEqual([]);
    });

    it('detects a drift when the database differs from the model', async () => {
      await testDataSource.query('ALTER TABLE files ADD COLUMN drifted int');
      try {
        const sqlInMemory = await testDataSource.driver.createSchemaBuilder().log();

        expect(sqlInMemory.upQueries.length).toBeGreaterThan(0);
      } finally {
        await testDataSource.query('ALTER TABLE files DROP COLUMN drifted');
      }
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
