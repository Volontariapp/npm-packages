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
import { MakeOrganizerIdMandatoryAndAddEmitterId1779542033290 } from './migrations/1779542033290-MakeOrganizerIdMandatoryAndAddEmitterId.js';
import { AddJobAuditStatusTrigger1779115100001 } from './migrations/1779115100001-AddJobAuditStatusTrigger.js';
import { AddJobAudit1779114963391 } from './migrations/1779114963391-AddJobAudit.js';
import { AddEmitterToJobAudit1779353596425 } from './migrations/1779353596425-AddEmitterToJobAudit.js';
import { FixEventQueueStatusDefault1779360000000 } from './migrations/1779360000000-FixEventQueueStatusDefault.js';
import { AddUpdatedByToTags1779555000000 } from './migrations/1779555000000-AddUpdatedByToTags.js';
import { AddUpdatedByToRequirements1779555000001 } from './migrations/1779555000001-AddUpdatedByToRequirements.js';

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
    SetupEventTriggers1776786226146,
    JobsOutboxAndEventQueueWithTraceId1776974876099,
    UpdateOutboxModels1777630647718,
    AddTargetServicesToEventQueue1777985367963,
    AddJobAudit1779114963391,
    AddJobAuditStatusTrigger1779115100001,
    AddEmitterToJobAudit1779353596425,
    FixEventQueueStatusDefault1779360000000,
    MakeOrganizerIdMandatoryAndAddEmitterId1779542033290,
    AddUpdatedByToTags1779555000000,
    AddUpdatedByToRequirements1779555000001,
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
