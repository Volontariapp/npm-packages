import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import { StorageJobType, StorageQueue } from '@volontariapp/messaging';
import { EntityType, FileId, FileStatus, ScanStatus } from '../../index.js';
import { FileModel } from '../../models/index.js';
import { MAX_PURGE_BATCH_SIZE, PostgresFileRepository } from '../../repositories/index.js';
import { closeTestDb, initializeTestDb, testDataSource, truncateAll } from '../data-source.js';
import { insertFile, readFile, readJobs } from '../helpers/file-db.helper.js';

const newId = (): string => FileId.generate().getValue();

describe('PostgresFileRepository purge (integration)', () => {
  let repository: PostgresFileRepository;
  const ownerId = newId();

  const fileOf = (
    status: FileStatus,
    updatedAt: Date,
    overrides: Parameters<typeof insertFile>[0] = {},
  ) =>
    insertFile({ ownerId, status, scanStatus: ScanStatus.CLEAN, ...overrides }).then(
      async (file) => {
        await testDataSource.query('UPDATE files SET updated_at = $1 WHERE id = $2', [
          updatedAt,
          file.id,
        ]);
        return file;
      },
    );

  beforeAll(async () => {
    await initializeTestDb();
    repository = new PostgresFileRepository(testDataSource.getRepository(FileModel));
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await truncateAll();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('releaseForOwner() cleanup job', () => {
    it('writes exactly one storage.cleanup_files job when files are released', async () => {
      await insertFile({ ownerId });
      await insertFile({ ownerId });

      const released = await repository.releaseForOwner({ ownerId });

      expect(released).toHaveLength(2);
      const jobs = await readJobs();
      expect(jobs).toHaveLength(1);
      expect(jobs[0].type).toBe(StorageJobType.CLEANUP_FILES);
      expect(jobs[0].target).toBe(StorageQueue.STORAGE);
      expect(jobs[0].payload).toEqual({});
      expect(jobs[0].emitterId).toBe(ownerId);
    });

    it('writes no job when nothing is released', async () => {
      await insertFile({ ownerId, entityType: EntityType.BADGE_ICON });
      await insertFile({ ownerId, status: FileStatus.ORPHANED });

      expect(await repository.releaseForOwner({ ownerId })).toEqual([]);
      expect(await readJobs()).toHaveLength(0);
    });

    it('writes no job on a replay', async () => {
      await insertFile({ ownerId });

      await repository.releaseForOwner({ ownerId });
      await repository.releaseForOwner({ ownerId });

      expect(await readJobs()).toHaveLength(1);
    });

    it('rolls the release back when the job cannot be written', async () => {
      const file = await insertFile({ ownerId });
      await testDataSource.query('ALTER TABLE jobs_outbox RENAME TO jobs_outbox_tmp');
      try {
        await expect(repository.releaseForOwner({ ownerId })).rejects.toThrow();
      } finally {
        await testDataSource.query('ALTER TABLE jobs_outbox_tmp RENAME TO jobs_outbox');
      }

      expect((await readFile(file.id)).status).toBe(FileStatus.PENDING);
    });
  });

  describe('releaseForEntity() cleanup job (G9)', () => {
    const entityId = newId();

    it('writes exactly one storage.cleanup_files job when files are released', async () => {
      await insertFile({ ownerId, entityId, status: FileStatus.ATTACHED });
      await insertFile({ ownerId, entityId, status: FileStatus.RESERVED });

      const result = await repository.releaseForEntity({ entityType: EntityType.POST, entityId });

      expect(result.releasedFileIds).toHaveLength(2);
      const jobs = await readJobs();
      expect(jobs).toHaveLength(1);
      expect(jobs[0].type).toBe(StorageJobType.CLEANUP_FILES);
      expect(jobs[0].target).toBe(StorageQueue.STORAGE);
      expect(jobs[0].payload).toEqual({});
      expect(jobs[0].emitterId).toBe(entityId);
    });

    it('writes no job when nothing is released, nor on a replay', async () => {
      await repository.releaseForEntity({ entityType: EntityType.POST, entityId });
      expect(await readJobs()).toHaveLength(0);

      await insertFile({ ownerId, entityId, status: FileStatus.ATTACHED });
      await repository.releaseForEntity({ entityType: EntityType.POST, entityId });
      await repository.releaseForEntity({ entityType: EntityType.POST, entityId });
      expect(await readJobs()).toHaveLength(1);
    });

    it('rolls the release back when the job cannot be written', async () => {
      const file = await insertFile({ ownerId, entityId, status: FileStatus.ATTACHED });
      await testDataSource.query('ALTER TABLE jobs_outbox RENAME TO jobs_outbox_tmp');
      try {
        await expect(
          repository.releaseForEntity({ entityType: EntityType.POST, entityId }),
        ).rejects.toThrow();
      } finally {
        await testDataSource.query('ALTER TABLE jobs_outbox_tmp RENAME TO jobs_outbox');
      }

      expect((await readFile(file.id)).status).toBe(FileStatus.ATTACHED);
    });
  });

  describe('releaseFile() cleanup job (G9)', () => {
    const entityId = newId();

    it('writes exactly one storage.cleanup_files job when the file is released', async () => {
      const file = await insertFile({
        ownerId,
        entityType: EntityType.USER_AVATAR,
        entityId,
        status: FileStatus.ATTACHED,
      });

      const released = await repository.releaseFile({
        fileId: file.id,
        entityType: EntityType.USER_AVATAR,
        entityId,
        ownerId,
      });

      expect(released).toBe(true);
      const jobs = await readJobs();
      expect(jobs).toHaveLength(1);
      expect(jobs[0].type).toBe(StorageJobType.CLEANUP_FILES);
      expect(jobs[0].payload).toEqual({});
      expect(jobs[0].emitterId).toBe(file.id);
    });

    it('writes no job when nothing is released, nor on a replay', async () => {
      const file = await insertFile({
        ownerId,
        entityType: EntityType.USER_AVATAR,
        entityId,
        status: FileStatus.ATTACHED,
      });
      const input = { fileId: file.id, entityType: EntityType.USER_AVATAR, entityId, ownerId };

      await repository.releaseFile({ ...input, newFileId: file.id });
      expect(await readJobs()).toHaveLength(0);

      await repository.releaseFile(input);
      await repository.releaseFile(input);
      expect(await readJobs()).toHaveLength(1);
    });

    it('rolls the release back when the job cannot be written', async () => {
      const file = await insertFile({
        ownerId,
        entityType: EntityType.USER_AVATAR,
        entityId,
        status: FileStatus.ATTACHED,
      });
      await testDataSource.query('ALTER TABLE jobs_outbox RENAME TO jobs_outbox_tmp');
      try {
        await expect(
          repository.releaseFile({
            fileId: file.id,
            entityType: EntityType.USER_AVATAR,
            entityId,
            ownerId,
          }),
        ).rejects.toThrow();
      } finally {
        await testDataSource.query('ALTER TABLE jobs_outbox_tmp RENAME TO jobs_outbox');
      }

      expect((await readFile(file.id)).status).toBe(FileStatus.ATTACHED);
    });
  });

  describe('requestPurge()', () => {
    const emitterId = newId();

    it('writes one storage.cleanup_files job when ORPHANED files are waiting', async () => {
      await fileOf(FileStatus.ORPHANED, new Date('2026-01-01T00:00:00Z'));

      expect(await repository.requestPurge(emitterId)).toBe(true);

      const jobs = await readJobs();
      expect(jobs).toHaveLength(1);
      expect(jobs[0].type).toBe(StorageJobType.CLEANUP_FILES);
      expect(jobs[0].target).toBe(StorageQueue.STORAGE);
      expect(jobs[0].payload).toEqual({});
      expect(jobs[0].emitterId).toBe(emitterId);
    });

    it('writes no job when no file is ORPHANED', async () => {
      for (const status of [
        FileStatus.PENDING,
        FileStatus.RESERVED,
        FileStatus.ATTACHED,
        FileStatus.DELETED,
      ]) {
        await fileOf(status, new Date('2026-01-01T00:00:00Z'));
      }

      expect(await repository.requestPurge(emitterId)).toBe(false);
      expect(await readJobs()).toHaveLength(0);
    });
  });

  describe('listPurgeCandidates()', () => {
    it('returns only ORPHANED rows, oldest first, limited', async () => {
      const newest = await fileOf(FileStatus.ORPHANED, new Date('2026-03-01T00:00:00Z'));
      const oldest = await fileOf(FileStatus.ORPHANED, new Date('2026-01-01T00:00:00Z'), {
        publicKey: 'public/oldest.png',
      });
      const middle = await fileOf(FileStatus.ORPHANED, new Date('2026-02-01T00:00:00Z'));
      for (const status of [
        FileStatus.PENDING,
        FileStatus.RESERVED,
        FileStatus.ATTACHED,
        FileStatus.DELETED,
      ]) {
        await fileOf(status, new Date('2025-01-01T00:00:00Z'));
      }

      const all = await repository.listPurgeCandidates(10);
      const limited = await repository.listPurgeCandidates(2);

      expect(all.map((candidate) => candidate.id)).toEqual([oldest.id, middle.id, newest.id]);
      expect(limited.map((candidate) => candidate.id)).toEqual([oldest.id, middle.id]);
      expect(all[0]).toEqual({
        id: oldest.id,
        quarantineKey: oldest.quarantineKey,
        publicKey: 'public/oldest.png',
      });
      expect(all[1].publicKey).toBeNull();
    });

    it('returns an empty list when nothing is orphaned', async () => {
      await insertFile({ ownerId });

      expect(await repository.listPurgeCandidates(10)).toEqual([]);
    });

    it.each([0, -1, 1.5, Number.NaN, MAX_PURGE_BATCH_SIZE + 1])(
      'refuses the batch size %s',
      async (limit) => {
        await expect(repository.listPurgeCandidates(limit)).rejects.toThrow(
          'Purge batch size must be an integer',
        );
      },
    );

    it('accepts the maximum batch size', async () => {
      await expect(repository.listPurgeCandidates(MAX_PURGE_BATCH_SIZE)).resolves.toEqual([]);
    });
  });

  describe('markDeleted()', () => {
    it('moves ORPHANED files to DELETED and refreshes updated_at', async () => {
      const orphaned = await fileOf(FileStatus.ORPHANED, new Date('2026-01-01T00:00:00Z'));

      const deleted = await repository.markDeleted([orphaned.id]);

      expect(deleted).toEqual([orphaned.id]);
      const row = await readFile(orphaned.id);
      expect(row.status).toBe(FileStatus.DELETED);
      expect(row.updatedAt.getTime()).toBeGreaterThan(new Date('2026-01-01T00:00:00Z').getTime());
    });

    it('never touches a file in another status', async () => {
      const others = await Promise.all(
        [FileStatus.PENDING, FileStatus.RESERVED, FileStatus.ATTACHED, FileStatus.DELETED].map(
          (status) => insertFile({ ownerId, status }),
        ),
      );
      const before = await Promise.all(others.map((file) => readFile(file.id)));

      const deleted = await repository.markDeleted(others.map((file) => file.id));

      expect(deleted).toEqual([]);
      expect(await Promise.all(others.map((file) => readFile(file.id)))).toEqual(before);
    });

    it('only returns the ids it moved, duplicates and unknown ids included in the input', async () => {
      const orphaned = await insertFile({ ownerId, status: FileStatus.ORPHANED });
      const pending = await insertFile({ ownerId });

      const deleted = await repository.markDeleted([orphaned.id, orphaned.id, pending.id, newId()]);

      expect(deleted).toEqual([orphaned.id]);
      expect((await readFile(pending.id)).status).toBe(FileStatus.PENDING);
    });

    it('is a no-op on a second call', async () => {
      const orphaned = await insertFile({ ownerId, status: FileStatus.ORPHANED });

      expect(await repository.markDeleted([orphaned.id])).toEqual([orphaned.id]);
      expect(await repository.markDeleted([orphaned.id])).toEqual([]);
    });

    it('runs no query for an empty input', async () => {
      const query = jest.spyOn(testDataSource.manager, 'query');

      expect(await repository.markDeleted([])).toEqual([]);
      expect(query).not.toHaveBeenCalled();
    });
  });
});
