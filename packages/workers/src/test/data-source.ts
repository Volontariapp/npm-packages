import { DataSource } from 'typeorm';
import { EventQueueModel, JobAuditModel, JobsOutboxModel } from '@volontariapp/database';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const loadMigrations = async (): Promise<Array<() => void>> => {
  const migrations: Array<() => void> = [];
  const migrationsDir = join(__dirname, 'migrations');

  const addDir = async (dirPath: string) => {
    const entries = readdirSync(dirPath, { withFileTypes: true });
    entries.sort((a, b) => a.name.localeCompare(b.name));

    for (const entry of entries) {
      const fullPath = join(dirPath, entry.name);
      if (entry.isDirectory()) {
        await addDir(fullPath);
      } else if (
        (entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) ||
        entry.name.endsWith('.js')
      ) {
        const mod = (await import(fullPath)) as Record<string, unknown>;
        for (const key of Object.keys(mod)) {
          if (typeof mod[key] === 'function') {
            migrations.push(mod[key] as () => void);
          }
        }
      }
    }
  };

  await addDir(migrationsDir);
  return migrations;
};

export const testDataSource = new DataSource({
  type: 'postgres',
  host: '127.0.0.1',
  port: 5433,
  username: 'testuser',
  password: 'testpassword',
  database: 'volontariapp_test',
  entities: [JobAuditModel, JobsOutboxModel, EventQueueModel],
  migrations: await loadMigrations(),
  synchronize: false,
  logging: false,
});

export const initializeTestDb = async (): Promise<void> => {
  if (!testDataSource.isInitialized) {
    await testDataSource.initialize();
    const queryRunner = testDataSource.createQueryRunner();
    await queryRunner.dropTable('job_audit', true);
    await queryRunner.dropTable('jobs_outbox', true);
    await queryRunner.dropTable('event_queue', true);
    await queryRunner.dropTable('migrations', true);
    await queryRunner.release();
    await testDataSource.runMigrations();
  }
};

export const closeTestDb = async (): Promise<void> => {
  if (testDataSource.isInitialized) {
    await testDataSource.destroy();
  }
};
