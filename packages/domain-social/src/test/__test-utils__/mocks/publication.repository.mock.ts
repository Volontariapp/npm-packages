import { jest } from '@jest/globals';
import type { IPublicationRepository } from '../../../repositories/interfaces/publication.repository.js';

export const createPublicationRepositoryMock = (): jest.Mocked<IPublicationRepository> =>
  ({
    createPostNode: jest.fn(),
    createPostNodes: jest.fn(),
    deletePostNode: jest.fn(),
    deletePostNodes: jest.fn(),
    postExists: jest.fn(),
    createOwnership: jest.fn<IPublicationRepository['createOwnership']>(),
    createOwnerships: jest.fn<IPublicationRepository['createOwnerships']>(),
    deleteOwnership: jest.fn<IPublicationRepository['deleteOwnership']>(),
    deleteOwnerships: jest.fn<IPublicationRepository['deleteOwnerships']>(),
    getUserPosts: jest.fn(),
    getFeed: jest.fn(),
  }) as unknown as jest.Mocked<IPublicationRepository>;
