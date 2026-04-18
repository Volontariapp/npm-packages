import { jest } from '@jest/globals';
import type { IRelationshipRepository } from '../../../repositories/interfaces/relationship.repository.js';

export const createRelationshipRepositoryMock = (): jest.Mocked<IRelationshipRepository> =>
  ({
    createFollow: jest.fn(),
    deleteFollow: jest.fn(),
    createBlock: jest.fn(),
    deleteBlock: jest.fn(),
    getFollows: jest.fn(),
    getFollowers: jest.fn(),
    getBlocks: jest.fn(),
    getWhoBlockedMe: jest.fn(),
  }) as unknown as jest.Mocked<IRelationshipRepository>;
