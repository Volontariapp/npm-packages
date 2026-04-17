import { DataSource } from 'typeorm';
import type { Repository } from '@volontariapp/database';
import { EventModel } from '../models/event.model.js';
import { TagModel } from '../models/tag.model.js';
import { RequirementModel } from '../models/requirement.model.js';
import { registerEventMappings } from '../models/mappers.js';
import { InitialSchema1776008237420 } from './migrations/1776008237420-InitialSchema.js';
import { AddDetailsToRequirement1776104175000 } from './migrations/1776104175000-AddDetailsToRequirement.js';
import { AddEventOrganizerAndMakeRequirementCreatorNullable1776104180000 } from './migrations/1776104180000-AddEventOrganizerAndMakeRequirementCreatorNullable.js';
import { UpdateTagSchemaAndAddEventLocalisation1776110000000 } from './migrations/1776110000000-UpdateTagSchemaAndAddEventLocalisation.js';

const isMigrationRun = process.env.TYPEORM_MIGRATION_RUN === 'true';

export const testDataSource = new DataSource({
  type: 'postgres',
  host: 'localhost',
  port: 5434,
  username: 'user',
  password: 'password',
  database: 'ms_event',
  entities: [EventModel, TagModel, RequirementModel],
  migrations: isMigrationRun
    ? [
        InitialSchema1776008237420,
        AddDetailsToRequirement1776104175000,
        AddEventOrganizerAndMakeRequirementCreatorNullable1776104180000,
        UpdateTagSchemaAndAddEventLocalisation1776110000000,
      ]
    : [],
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
