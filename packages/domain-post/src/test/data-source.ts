import type { Repository } from '@volontariapp/database';
import { DataSource } from 'typeorm';
import { PostModel, CommentModel } from '../models/index.js';
import { registerPostMappings } from '../models/mapper.js';

import { InitialPostSchema1776000000000 } from './migrations/1776000000000-InitialPostSchema.js';
import { JobsOutboxAndEventQueue1776785940565 } from './migrations/1776785940565-JobsOutboxAndEventQueue.js';
import { JobsOutboxAndEventQueueWithTraceId1776975278062 } from './migrations/1776975278062-JobsOutboxAndEventQueueWithTraceId.js';
import { UpdateOutboxModels1777630651338 } from './migrations/1777630651338-UpdateOutboxModels.js';
import { AddUniqueConstraintToPostTitle1776000000001 } from './migrations/1776000000001-AddUniqueConstraintToPostTitle.js';
import { InitialCommentSchema1780000000000 } from './migrations/1780000000000-InitialCommentSchema.js';

export const testDataSource = new DataSource({
  type: 'postgres',
  host: 'localhost',
  port: 5433,
  username: 'user',
  password: 'password',
  database: 'ms_post',
  entities: [PostModel, CommentModel],
  migrations: [
    InitialPostSchema1776000000000,
    JobsOutboxAndEventQueue1776785940565,
    JobsOutboxAndEventQueueWithTraceId1776975278062,
    UpdateOutboxModels1777630651338,
    AddUniqueConstraintToPostTitle1776000000001,
    InitialCommentSchema1780000000000,
  ],
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
  await testDataSource.query('TRUNCATE TABLE posts, comments RESTART IDENTITY CASCADE');
};
