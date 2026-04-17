import { jest } from '@jest/globals';
import type { IRequirementRepository } from '../../../repositories/interfaces/requirement.repository.js';

export const createRequirementRepositoryMock = (): jest.Mocked<IRequirementRepository> =>
  ({
    findAll: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  }) as unknown as jest.Mocked<IRequirementRepository>;
