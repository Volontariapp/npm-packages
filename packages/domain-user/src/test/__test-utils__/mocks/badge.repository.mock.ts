import { jest } from '@jest/globals';
import type { IBadgeRepository } from '../../../repositories/interfaces/badge.repository.js';

export const createBadgeRepositoryMock = (): jest.Mocked<IBadgeRepository> =>
  ({
    findById: jest.fn(),
    findManyByIds: jest.fn(),
    findBySlug: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  }) as unknown as jest.Mocked<IBadgeRepository>;
