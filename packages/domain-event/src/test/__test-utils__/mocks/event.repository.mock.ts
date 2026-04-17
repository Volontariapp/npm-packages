import { jest } from '@jest/globals';
import type { IEventRepository } from '../../../repositories/interfaces/event.repository.js';

export const createEventRepositoryMock = (): jest.Mocked<IEventRepository> =>
  ({
    findAll: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    search: jest.fn(),
  }) as unknown as jest.Mocked<IEventRepository>;
