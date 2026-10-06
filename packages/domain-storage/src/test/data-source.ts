import { DataSource } from 'typeorm';
import { FileModel, ReleasedEntityModel } from '../models/index.js';
import { InitialStorageSchema1791300000000 } from './migrations/domain/1791300000000-InitialStorageSchema.js';

const LOCAL_HOSTS: readonly string[] = ['localhost', '127.0.0.1'];

const host = process.env.TEST_DB_HOST ?? 'localhost';

export const testDataSource = new DataSource({
  type: 'postgres',
  host,
  port: Number(process.env.TEST_DB_PORT ?? 5437),
  username: process.env.TEST_DB_USER ?? 'user',
  password: process.env.TEST_DB_PASSWORD ?? 'password',
  database: process.env.TEST_DB_NAME ?? 'ms_storage',
  entities: [FileModel, ReleasedEntityModel],
  migrations: [InitialStorageSchema1791300000000],
  synchronize: false,
  logging: false,
});

/**
 * Drops the whole database before migrating, so it must never point to a
 * shared database: only a local one is accepted.
 */
export const initializeTestDb = async (): Promise<void> => {
  if (!LOCAL_HOSTS.includes(host)) {
    throw new Error(
      `Refusing to drop the database on '${host}': integration tests only run against a local database.`,
    );
  }

  if (!testDataSource.isInitialized) {
    await testDataSource.initialize();
    await testDataSource.dropDatabase();
    await testDataSource.runMigrations();
  }
};

export const closeTestDb = async (): Promise<void> => {
  if (testDataSource.isInitialized) {
    await testDataSource.destroy();
  }
};

export const truncateAll = async (): Promise<void> => {
  await testDataSource.query('TRUNCATE TABLE files, released_entities RESTART IDENTITY CASCADE');
};
