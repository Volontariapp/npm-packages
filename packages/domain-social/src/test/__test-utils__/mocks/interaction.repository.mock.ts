import { jest } from '@jest/globals';
import type { IInteractionRepository } from '../../../repositories/interfaces/interaction.repository.js';

export const createInteractionRepositoryMock = (): jest.Mocked<IInteractionRepository> =>
  ({
    createLike: jest.fn(),
    deleteLike: jest.fn(),
    getUserLikes: jest.fn(),
    getPostLikers: jest.fn(),
  }) as unknown as jest.Mocked<IInteractionRepository>;
