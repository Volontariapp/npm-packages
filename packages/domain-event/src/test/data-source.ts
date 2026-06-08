import { DataSource } from 'typeorm';
import type { Repository } from '@volontariapp/database';
import { EventModel } from '../models/event.model.js';
import { TagModel } from '../models/tag.model.js';
import { RequirementModel } from '../models/requirement.model.js';
import { registerEventMappings } from '../models/mappers.js';
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
  await addDir('common');
  await addDir('domain');
  return migrations;
};

export const testDataSource = new DataSource({
  type: 'postgres',
  host: 'localhost',
  port: 5434,
  username: 'user',
  password: 'password',
  database: 'ms_event',
  entities: [EventModel, TagModel, RequirementModel, EventQueueModel, JobsOutboxModel],
  migrations: await loadMigrations(),
  synchronize: false,
  logging: false,
});

export const getTestRepository = <T extends object>(EntityClass: new () => T): Repository<T> =>
  testDataSource.getRepository(EntityClass) as unknown as Repository<T>;

export const initializeTestDb = async (): Promise<void> => {
  if (!testDataSource.isInitialized) {
    await testDataSource.initialize();
    await testDataSource.dropDatabase();
    await testDataSource.runMigrations();
  }

  registerEventMappings();
};

export const closeTestDb = async (): Promise<void> => {
  if (testDataSource.isInitialized) {
    await testDataSource.destroy();
  }
};

export const truncateAll = async (): Promise<void> => {
  await testDataSource.query(
    'TRUNCATE TABLE event_tags, event_requirements, events, tags, requirements, event_queue, jobs_outbox CASCADE;',
  );
};
