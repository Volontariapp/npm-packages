import { DataSource } from 'typeorm';
import { EventQueueModel, JobsOutboxModel } from '@volontariapp/database';

export const testDataSource = new DataSource({
  type: 'postgres',
  host: 'localhost',
  port: 5433,
  username: 'testuser',
  password: 'testpassword',
  database: 'volontariapp_test',
  entities: [JobsOutboxModel, EventQueueModel],
  synchronize: true,
  logging: false,
  dropSchema: true,
});

export const initializeTestDb = async () => {
  if (!testDataSource.isInitialized) {
    await testDataSource.initialize();
  }
};

export const closeTestDb = async () => {
  if (testDataSource.isInitialized) {
    await testDataSource.destroy();
  }
};
