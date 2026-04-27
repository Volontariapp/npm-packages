import { beforeAll, afterAll, beforeEach } from '@jest/globals';
import type { EntityTarget, ObjectLiteral } from 'typeorm';
import { testDataSource, initializeTestDb, closeTestDb } from '../data-source.js';

export const setupIntegrationTest = (entitiesToClear: EntityTarget<ObjectLiteral>[] = []) => {
  beforeAll(async () => {
    await initializeTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    for (const entity of entitiesToClear) {
      await testDataSource.getRepository(entity).createQueryBuilder().delete().execute();
    }
  });
};
