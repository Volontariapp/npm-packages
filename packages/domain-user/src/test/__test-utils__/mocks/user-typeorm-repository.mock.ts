import { jest } from '@jest/globals';
import type { Repository } from '@volontariapp/database';
import type { UserModel } from '../../../models/user.model.js';

/** Repository TypeORM minimal: seules les lectures utilisees par findPage/findByIds. */
export const createUserTypeOrmRepositoryMock = (): jest.Mocked<Repository<UserModel>> =>
  ({
    metadata: {
      primaryColumns: [{ propertyName: 'id' }],
      name: 'UserModel',
      tableName: 'users',
      columns: [],
      relations: [],
    },
    find: jest.fn(),
    findAndCount: jest.fn(),
  }) as unknown as jest.Mocked<Repository<UserModel>>;
