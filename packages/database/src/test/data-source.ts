import { DataSource } from 'typeorm';
import { UserModel } from './example/models/user.model.js';
import { ProfileModel } from './example/models/profile.model.js';

export const testDataSource = new DataSource({
  type: 'postgres',
  host: 'localhost',
  port: 5433,
  username: 'testuser',
  password: 'testpassword',
  database: 'volontariapp_test',
  entities: [UserModel, ProfileModel],
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
