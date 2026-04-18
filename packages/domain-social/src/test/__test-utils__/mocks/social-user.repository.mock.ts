import { jest } from '@jest/globals';
import type { ISocialUserRepository } from '../../../repositories/interfaces/social-user.repository.js';

export const createSocialUserRepositoryMock = (): jest.Mocked<ISocialUserRepository> =>
  ({
    createNode: jest.fn(),
    deleteNode: jest.fn(),
    exists: jest.fn(),
  }) as unknown as jest.Mocked<ISocialUserRepository>;
