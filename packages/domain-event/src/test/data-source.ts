import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { DataSource } from 'typeorm';
import type { Repository } from '@volontariapp/database';
import { EventModel } from '../models/event.model.js';
import { TagModel } from '../models/tag.model.js';
import { RequirementModel } from '../models/requirement.model.js';
import { registerEventMappings } from '../models/mappers.js';

export const testDataSource = new DataSource({
  type: 'postgres',
  host: 'localhost',
  port: 5434,
  username: 'user',
  password: 'password',
  database: 'ms_event',
  entities: [EventModel, TagModel, RequirementModel],
  migrations: [join(dirname(fileURLToPath(import.meta.url)), 'migrations', '*.ts')],
  synchronize: false,
  logging: false,
});

export const getTestRepository = <T extends object>(EntityClass: new () => T): Repository<T> =>
  testDataSource.getRepository(EntityClass) as unknown as Repository<T>;

export const initializeTestDb = async (): Promise<void> => {
  if (!testDataSource.isInitialized) {
    await testDataSource.initialize();
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
    'TRUNCATE TABLE event_tags, event_requirements, events, tags, requirements CASCADE;',
  );
};
