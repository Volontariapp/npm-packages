import { DataSource } from 'typeorm';
import { EventQueueModel, JobsOutboxModel } from '@volontariapp/database';

export const testDataSource = new DataSource({
  type: 'postgres',
  host: '127.0.0.1',
  port: 5433,
  username: 'testuser',
  password: 'testpassword',
  database: 'volontariapp_test',
  entities: [EventQueueModel, JobsOutboxModel],
  synchronize: true,
  logging: false,
});

export const initializeTestDb = async () => {
  if (!testDataSource.isInitialized) {
    await testDataSource.initialize();
    await testDataSource.synchronize(true);
  }
};

export const closeTestDb = async () => {
  if (testDataSource.isInitialized) {
    await testDataSource.destroy();
  }
};
