import { DataSource } from 'typeorm';
import type { Repository } from '@volontariapp/database';
import { EventModel } from '../models/event.model.js';
import { TagModel } from '../models/tag.model.js';
import { RequirementModel } from '../models/requirement.model.js';
import { registerEventMappings } from '../models/mappers.js';
import { EventQueueModel, JobsOutboxModel } from '@volontariapp/database';

import { InitialSchema1776008237420 } from './migrations/1776008237420-InitialSchema.js';
import { AddDetailsToRequirement1776104175000 } from './migrations/1776104175000-AddDetailsToRequirement.js';
import { AddEventOrganizerAndMakeRequirementCreatorNullable1776104180000 } from './migrations/1776104180000-AddEventOrganizerAndMakeRequirementCreatorNullable.js';
import { UpdateTagSchemaAndAddEventLocalisation1776110000000 } from './migrations/1776110000000-UpdateTagSchemaAndAddEventLocalisation.js';
import { JobsOutboxAndEventQueue1776786226145 } from './migrations/1776786226145-JobsOutboxAndEventQueue.js';
import { JobsOutboxAndEventQueueWithTraceId1776974876099 } from './migrations/1776974876099-JobsOutboxAndEventQueueWithTraceId.js';
import { UpdateOutboxModels1777630647718 } from './migrations/1777630647718-UpdateOutboxModels.js';
import { SetupEventTriggers1776786226146 } from './migrations/1776786226146-SetupEventTriggers.js';
import { AddTargetServicesToEventQueue1777985367963 } from './migrations/1777985367963-AddTargetServicesToEventQueue.js';

export const testDataSource = new DataSource({
  type: 'postgres',
  host: 'localhost',
  port: 5434,
  username: 'user',
  password: 'password',
  database: 'ms_event',
  entities: [EventModel, TagModel, RequirementModel, EventQueueModel, JobsOutboxModel],

  migrations: [
    InitialSchema1776008237420,
    AddDetailsToRequirement1776104175000,
    AddEventOrganizerAndMakeRequirementCreatorNullable1776104180000,
    UpdateTagSchemaAndAddEventLocalisation1776110000000,
    JobsOutboxAndEventQueue1776786226145,
    JobsOutboxAndEventQueueWithTraceId1776974876099,
    UpdateOutboxModels1777630647718,
    SetupEventTriggers1776786226146,
    AddTargetServicesToEventQueue1777985367963,
  ],
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
    'TRUNCATE TABLE event_tags, event_requirements, events, tags, requirements, event_queue, jobs_outbox CASCADE;',
  );
};
