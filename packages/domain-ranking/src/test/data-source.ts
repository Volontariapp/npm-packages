import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { EventQueueModel, JobsOutboxModel } from '@volontariapp/database';
import { RANKING_MODELS } from '../models/index.js';

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

// postgres-ranking of ci-tools/docker-compose.yml (port 5438).
export const testDataSource = new DataSource({
  type: 'postgres',
  host: 'localhost',
  port: 5438,
  username: 'user',
  password: 'password',
  database: 'ms_ranking',
  entities: [...RANKING_MODELS, EventQueueModel, JobsOutboxModel],
  migrations: await loadMigrations(),
  synchronize: false,
  logging: false,
});

export const initializeTestDb = async (): Promise<void> => {
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
    `TRUNCATE TABLE ranking_score, ranking_post_score, ranking_run, ranking_request,
       ranking_like_log, ranking_event_feedback, ranking_event_wish, ranking_event_mention,
       ranking_user_location, ranking_rate_bucket, event_queue, jobs_outbox RESTART IDENTITY CASCADE`,
  );
};
