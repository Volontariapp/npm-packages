import { jest } from '@jest/globals';
import type { IEventPostLinkRepository } from '../../../repositories/interfaces/event-post-link.repository.js';

export const createEventPostLinkRepositoryMock = (): jest.Mocked<IEventPostLinkRepository> =>
  ({
    linkPostToEvent: jest.fn(),
    unlinkPostFromEvent: jest.fn(),
    getEventRelatedToPost: jest.fn(),
    getEventPosts: jest.fn(),
  }) as unknown as jest.Mocked<IEventPostLinkRepository>;
