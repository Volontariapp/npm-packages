import { jest } from '@jest/globals';
import type { ITagRepository } from '../../../repositories/interfaces/tag.repository.js';

export const createTagRepositoryMock = (): jest.Mocked<ITagRepository> =>
  ({
    findAll: jest.fn(),
    findById: jest.fn(),
    findByIds: jest.fn(),
    findBySlug: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  }) as unknown as jest.Mocked<ITagRepository>;
