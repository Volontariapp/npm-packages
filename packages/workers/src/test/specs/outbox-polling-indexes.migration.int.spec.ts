import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import type { QueryRunner } from 'typeorm';
import { testDataSource, initializeTestDb, closeTestDb } from '../data-source.js';
import { AddOutboxPollingIndexes1794166000000 } from '../migrations/1794166000000-AddOutboxPollingIndexes.js';

const POLLING_INDEXES = ['IDX_event_queue_status_created_at', 'IDX_jobs_outbox_status_created_at'];

describe('AddOutboxPollingIndexes migration (Integration)', () => {
  let queryRunner: QueryRunner;
  const migration = new AddOutboxPollingIndexes1794166000000();

  const existingIndexes = async (): Promise<string[]> => {
    const rows = await queryRunner.manager
      .createQueryBuilder()
      .select('i.indexname', 'indexname')
      .from('pg_indexes', 'i')
      .where('i.indexname IN (:...names)', { names: POLLING_INDEXES })
      .orderBy('i.indexname', 'ASC')
      .getRawMany<{ indexname: string }>();
    return rows.map((row) => row.indexname);
  };

  beforeAll(async () => {
    await initializeTestDb();
    queryRunner = testDataSource.createQueryRunner();
  });

  afterAll(async () => {
    await queryRunner.release();
    await closeTestDb();
  });

  it('is applied by the regular migration run', async () => {
    expect(await existingIndexes()).toEqual([...POLLING_INDEXES].sort());
  });

  it('removes both indexes on down and brings them back on up', async () => {
    await migration.down(queryRunner);
    expect(await existingIndexes()).toEqual([]);

    await migration.up(queryRunner);
    expect(await existingIndexes()).toEqual([...POLLING_INDEXES].sort());
  });

  it('can run up a second time without failing', async () => {
    await expect(migration.up(queryRunner)).resolves.toBeUndefined();
    expect(await existingIndexes()).toEqual([...POLLING_INDEXES].sort());
  });
});
