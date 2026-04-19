import { DataSource } from 'typeorm';
import { UserModel } from './example/models/user.model.js';
import { ProfileModel } from './example/models/profile.model.js';
import { OutboxModel } from '../outbox/models/outbox.model.js';
import { ExtendedOutboxModel } from './example/models/extended-outbox.model.js';

export const testDataSource = new DataSource({
  type: 'postgres',
  host: 'localhost',
  port: 5433,
  username: 'testuser',
  password: 'testpassword',
  database: 'volontariapp_test',
  entities: [UserModel, ProfileModel, OutboxModel, ExtendedOutboxModel],
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
