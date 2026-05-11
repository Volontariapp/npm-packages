import { DataSource } from 'typeorm';
import { JobAuditModel } from '../data/models/job-audit.model.js';
import { InitialSchemaJobAudit1778328780881 } from './migrations/1778328780881-InitialSchemaJobAudit.js';

export const testDataSource = new DataSource({
  type: 'postgres',
  host: '127.0.0.1',
  port: 5433,
  username: 'testuser',
  password: 'testpassword',
  database: 'volontariapp_test',
  entities: [JobAuditModel],
  migrations: [InitialSchemaJobAudit1778328780881],
  synchronize: false,
  logging: false,
});

export const initializeTestDb = async () => {
  if (!testDataSource.isInitialized) {
    await testDataSource.initialize();
    const queryRunner = testDataSource.createQueryRunner();
    await queryRunner.dropTable('job_audit', true);
    await queryRunner.release();
    const migrations = await testDataSource.runMigrations();
    console.log('[initDb] Migrations executed:', migrations.length);
    if (migrations.length === 0) {
      console.error('[initDb] No migrations! Loading manually...');
      await testDataSource.synchronize();
    }
  }
};

export const closeTestDb = async () => {
  if (testDataSource.isInitialized) {
    await testDataSource.destroy();
  }
};
