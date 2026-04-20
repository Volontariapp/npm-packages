import type { Repository } from 'typeorm';
import { DataSource } from 'typeorm';
import { UserEntity } from '../entities/user.entity.js';
import { BadgeEntity } from '../entities/badge.entity.js';
import { InitialUserSchema1776334421317 } from './migrations/1776334421317-InitialUserSchema.js';
import { registerUserMappings } from '../models/mapper.js';

const isMigrationRun = process.env.TYPEORM_MIGRATION_RUN === 'true';

export const testDataSource = new DataSource({
  type: 'postgres',
  host: 'localhost',
  port: 5434,
  username: 'user',
  password: 'password',
  database: 'ms_event',
  entities: [UserEntity, BadgeEntity, UserEntity],
  migrations: isMigrationRun ? [InitialUserSchema1776334421317] : [],
  synchronize: false,
  logging: false,
});

export const getTestRepository = <T extends object>(EntityClass: new () => T): Repository<T> =>
  testDataSource.getRepository(EntityClass) as unknown as Repository<T>;

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
