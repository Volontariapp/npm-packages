import type { Repository } from '@volontariapp/database';
import { DataSource } from 'typeorm';
import { UserModel } from '../models/user.model.js';
import { BadgeModel } from '../models/badge.model.js';
import { UserBadgeModel } from '../models/user-badge.model.js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { registerUserMappings } from '../models/mapper.js';

export const testDataSource = new DataSource({
  type: 'postgres',
  host: 'localhost',
  port: 5432,
  username: 'user',
  password: 'password',
  database: 'ms_user',
  entities: [UserModel, BadgeModel, UserBadgeModel],
  migrations: [join(dirname(fileURLToPath(import.meta.url)), 'migrations', '**', '*.{ts,js}')],
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
