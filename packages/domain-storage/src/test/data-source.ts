import { EventQueueModel, JobsOutboxModel } from '@volontariapp/database';
import { readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DataSource } from 'typeorm';
import { FileModel, ReleasedEntityModel } from '../models/index.js';

const MIGRATIONS_DIR = join(dirname(fileURLToPath(import.meta.url)), 'migrations');

/** Domain migrations (`files`, `released_entities`) then the common outbox ones, ordered by timestamp. */
const loadMigrations = async (): Promise<Array<() => void>> => {
  const migrations: Array<() => void> = [];
  for (const directory of ['domain', 'common']) {
    const directoryPath = join(MIGRATIONS_DIR, directory);
    const files = readdirSync(directoryPath).filter(
      (file) => file.endsWith('.ts') || file.endsWith('.js'),
    );
    for (const file of files) {
      const module = (await import(join(directoryPath, file))) as Record<string, unknown>;
      for (const exported of Object.values(module)) {
        if (typeof exported === 'function') {
          migrations.push(exported as () => void);
        }
      }
    }
  }
  return migrations;
};

const LOCAL_HOSTS: readonly string[] = ['localhost', '127.0.0.1'];

const host = process.env.TEST_DB_HOST ?? 'localhost';

export const testDataSource = new DataSource({
  type: 'postgres',
  host,
  port: Number(process.env.TEST_DB_PORT ?? 5437),
  username: process.env.TEST_DB_USER ?? 'user',
  password: process.env.TEST_DB_PASSWORD ?? 'password',
  database: process.env.TEST_DB_NAME ?? 'ms_storage',
  entities: [FileModel, ReleasedEntityModel, EventQueueModel, JobsOutboxModel],
  migrations: await loadMigrations(),
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
  await testDataSource.query(
    'TRUNCATE TABLE files, released_entities, event_queue, jobs_outbox RESTART IDENTITY CASCADE',
  );
};
