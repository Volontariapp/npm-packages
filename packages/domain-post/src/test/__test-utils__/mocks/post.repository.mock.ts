import { jest } from '@jest/globals';
import type { IPostRepository } from '../../../repositories/interfaces/post.repository.js';

export const createPostRepositoryMock = (): jest.Mocked<IPostRepository> =>
  ({
    findById: jest.fn(),
    findByAuthorId: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
    createWithPostCreated: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    deleteWithPostDeleted: jest.fn(),
    deleteByAuthorId: jest.fn(),
    search: jest.fn(),
  }) as unknown as jest.Mocked<IPostRepository>;
