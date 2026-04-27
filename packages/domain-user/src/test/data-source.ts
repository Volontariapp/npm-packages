import type { Repository } from '@volontariapp/database';
import { DataSource } from 'typeorm';
import { UserModel } from '../models/user.model.js';
import { BadgeModel } from '../models/badge.model.js';
import { UserBadgeModel } from '../models/user-badge.model.js';
import { InitialUserSchema1776334421317 } from './migrations/1776334421317-InitialUserSchema.js';
import { registerUserMappings } from '../models/mapper.js';

const isMigrationRun = process.env.TYPEORM_MIGRATION_RUN === 'true';

export const testDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 5432),
  username: process.env.DB_USER ?? 'user',
  password: process.env.DB_PASSWORD ?? 'password',
  database: process.env.DB_NAME ?? 'ms_user',
  entities: [UserModel, BadgeModel, UserBadgeModel],
  migrationsRun: true,
  migrations: isMigrationRun ? [InitialUserSchema1776334421317] : [],
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
