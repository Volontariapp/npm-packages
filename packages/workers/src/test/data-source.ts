import { DataSource } from 'typeorm';
import { JobAuditModel, JobsOutboxModel } from '@volontariapp/database';
import { InitialSchemaJobAudit1778328780881 } from './migrations/1778328780881-InitialSchemaJobAudit.js';
import { CreateJobsOutbox1776783577425 } from './migrations/1776783577425-CreateJobsOutbox.js';

export const testDataSource = new DataSource({
  type: 'postgres',
  host: '127.0.0.1',
  port: 5433,
  username: 'testuser',
  password: 'testpassword',
  database: 'volontariapp_test',
  entities: [JobAuditModel, JobsOutboxModel],
  migrations: [CreateJobsOutbox1776783577425, InitialSchemaJobAudit1778328780881],
  synchronize: false,
  logging: false,
});

export const initializeTestDb = async () => {
  if (!testDataSource.isInitialized) {
    await testDataSource.initialize();
    const queryRunner = testDataSource.createQueryRunner();
    await queryRunner.dropTable('job_audit', true);
    await queryRunner.dropTable('jobs_outbox', true);
    await queryRunner.dropTable('migrations', true);
    await queryRunner.release();
    await testDataSource.runMigrations();
  }
};

export const closeTestDb = async () => {
  if (testDataSource.isInitialized) {
    await testDataSource.destroy();
  }
};
