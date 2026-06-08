import type { Repository } from '@volontariapp/database';
import { DataSource } from 'typeorm';
import { PostModel, CommentModel } from '../models/index.js';
import { registerPostMappings } from '../models/mapper.js';

import { EventQueueModel, JobsOutboxModel } from '@volontariapp/database';

import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const loadMigrations = async (): Promise<Array<() => void>> => {
  const migrations: Array<() => void> = [];
  const addDir = async (dirName: string) => {
    const dirPath = join(__dirname, 'migrations', dirName);
    const files = readdirSync(dirPath).filter((f) => f.endsWith('.ts') || f.endsWith('.js'));
    for (const file of files) {
      const mod = (await import(join(dirPath, file))) as Record<string, unknown>;
      for (const key of Object.keys(mod)) {
        if (typeof mod[key] === 'function') {
          migrations.push(mod[key] as () => void);
        }
      }
    }
  };
  await addDir('domain');
  await addDir('common');
  return migrations;
};

export const testDataSource = new DataSource({
  type: 'postgres',
  host: 'localhost',
  port: 5433,
  username: 'user',
  password: 'password',
  database: 'ms_post',
  entities: [PostModel, CommentModel, EventQueueModel, JobsOutboxModel],
  migrations: await loadMigrations(),
  synchronize: false,
  logging: false,
});

export const getTestRepository = <T extends object>(ModelClass: new () => T): Repository<T> =>
  testDataSource.getRepository(ModelClass) as unknown as Repository<T>;

export const initializeTestDb = async (): Promise<void> => {
  if (!testDataSource.isInitialized) {
    await testDataSource.initialize();
    await testDataSource.dropDatabase();
    await testDataSource.runMigrations();
  }

  registerPostMappings();
};

export const closeTestDb = async (): Promise<void> => {
  if (testDataSource.isInitialized) {
    await testDataSource.destroy();
  }
};

export const truncateAll = async (): Promise<void> => {
  await testDataSource.query(
    'TRUNCATE TABLE posts, comments, event_queue, jobs_outbox RESTART IDENTITY CASCADE',
  );
};
