import { jest } from '@jest/globals';
import type { IPublicationRepository } from '../../../repositories/interfaces/publication.repository.js';

export const createPublicationRepositoryMock = (): jest.Mocked<IPublicationRepository> =>
  ({
    createPostNode: jest.fn(),
    deletePostNode: jest.fn(),
    postExists: jest.fn(),
    createOwnership: jest.fn(),
    deleteOwnership: jest.fn(),
    getUserPosts: jest.fn(),
    getFeed: jest.fn(),
  }) as unknown as jest.Mocked<IPublicationRepository>;
