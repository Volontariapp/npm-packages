import type { Repository } from '@volontariapp/database';
import { DataSource } from 'typeorm';
import { UserModel } from '../models/user.model.js';
import { BadgeModel } from '../models/badge.model.js';
import { UserBadgeModel } from '../models/user-badge.model.js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readdirSync } from 'fs';
import { registerUserMappings } from '../models/mapper.js';

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
  await addDir('common');
  await addDir('domain');
  return migrations;
};

export const testDataSource = new DataSource({
  type: 'postgres',
  host: 'localhost',
  port: 5432,
  username: 'user',
  password: 'password',
  database: 'ms_user',
  entities: [UserModel, BadgeModel, UserBadgeModel],
  migrations: await loadMigrations(),
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
