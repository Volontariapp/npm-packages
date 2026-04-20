import { jest } from '@jest/globals';
import type { IUserRepository } from '../../../repositories/interfaces/user.repository.js';

export const createUserRepositoryMock = (): jest.Mocked<IUserRepository> =>
  ({
    findById: jest.fn(),
    findByEmail: jest.fn(),
    findByRna: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    addBadgeToUser: jest.fn(),
    removeBadgeFromUser: jest.fn(),
    incrementImpactScore: jest.fn(),
  }) as unknown as jest.Mocked<IUserRepository>;
