import type { Repository } from '@volontariapp/database';
import { DataSource } from 'typeorm';
import { UserModel } from '../models/user.model.js';
import { BadgeModel } from '../models/badge.model.js';
import { UserBadgeModel } from '../models/user-badge.model.js';
import { InitialUserSchema1776334421317 } from './migrations/1776334421317-InitialUserSchema.js';
import { JobsOutboxAndEventQueue1776783577424 } from './migrations/1776783577424-JobsOutboxAndEventQueue.js';
import { JobsOutboxAndEventQueueWithTraceId1776974541295 } from './migrations/1776974541295-JobsOutboxAndEventQueueWithTraceId.js';
import { UpdateOutboxModels1777630654143 } from './migrations/1777630654143-UpdateOutboxModels.js';
import { AddLogoPathToUser1777715959557 } from './migrations/1777715959557-AddLogoPathToUser.js';
import { registerUserMappings } from '../models/mapper.js';

export const testDataSource = new DataSource({
  type: 'postgres',
  host: 'localhost',
  port: 5432,
  username: 'user',
  password: 'password',
  database: 'ms_user',
  entities: [UserModel, BadgeModel, UserBadgeModel],
  migrationsRun: true,
  migrations: [
    InitialUserSchema1776334421317,
    JobsOutboxAndEventQueue1776783577424,
    JobsOutboxAndEventQueueWithTraceId1776974541295,
    UpdateOutboxModels1777630654143,
    AddLogoPathToUser1777715959557,
  ],
  synchronize: false,
  logging: false,
});

export const getTestRepository = <T extends object>(ModelClass: new () => T): Repository<T> =>
  testDataSource.getRepository(ModelClass) as unknown as Repository<T>;

export const initializeTestDb = async (): Promise<void> => {
  if (!testDataSource.isInitialized) {
    await testDataSource.initialize();
  }

  registerUserMappings();
};

export const closeTestDb = async (): Promise<void> => {
  if (testDataSource.isInitialized) {
    await testDataSource.destroy();
  }
};

export const truncateAll = async (): Promise<void> => {
  await testDataSource.query('TRUNCATE TABLE users, badges, user_badges RESTART IDENTITY CASCADE');
};
