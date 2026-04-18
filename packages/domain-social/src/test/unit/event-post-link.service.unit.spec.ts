import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { EventPostLinkService } from '../../services/event-post-link.service.js';
import type { IEventPostLinkRepository } from '../../repositories/interfaces/event-post-link.repository.js';
import { createEventPostLinkRepositoryMock } from '../__test-utils__/mocks/event-post-link.repository.mock.js';
import { PaginatedIdsFactory } from '../__test-utils__/factories/paginated-ids.factory.js';

const PAGINATION = { page: 1, limit: 10 };

describe('EventPostLinkService (Unit)', () => {
  let service: EventPostLinkService;
  let mockRepository: jest.Mocked<IEventPostLinkRepository>;

  beforeEach(() => {
    mockRepository = createEventPostLinkRepositoryMock();
    service = new EventPostLinkService(mockRepository);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ─── linkPostToEvent ──────────────────────────────────────────────────────

  describe('linkPostToEvent()', () => {
    it('should call repository.linkPostToEvent with correct args', async () => {
      const linkPostToEventSpy = jest.spyOn(mockRepository, 'linkPostToEvent').mockResolvedValue(undefined);

      await service.linkPostToEvent('post-1', 'event-1');

      expect(linkPostToEventSpy).toHaveBeenCalledWith('post-1', 'event-1');
    });

    it('should throw DATABASE_ERROR on a generic repository failure', async () => {
      jest.spyOn(mockRepository, 'linkPostToEvent').mockRejectedValue(new Error('Merge failed'));

      await expect(service.linkPostToEvent('post-1', 'event-1')).rejects.toMatchObject({
        code: 'DATABASE_ERROR',
      });
    });

    it('should rethrow a BaseError without wrapping', async () => {
      jest.spyOn(mockRepository, 'linkPostToEvent').mockRejectedValue({
        code: 'DATABASE_QUERY_ERROR',
        isBaseError: true,
      });

      await expect(service.linkPostToEvent('post-1', 'event-1')).rejects.toMatchObject({
        isBaseError: true,
      });
    });
  });

  // ─── unlinkPostFromEvent ──────────────────────────────────────────────────

  describe('unlinkPostFromEvent()', () => {
    it('should call repository.unlinkPostFromEvent with correct args', async () => {
      const unlinkPostFromEventSpy = jest.spyOn(mockRepository, 'unlinkPostFromEvent').mockResolvedValue(undefined);

      await service.unlinkPostFromEvent('post-1', 'event-1');

      expect(unlinkPostFromEventSpy).toHaveBeenCalledWith('post-1', 'event-1');
    });

    it('should throw DATABASE_ERROR on a generic repository failure', async () => {
      jest.spyOn(mockRepository, 'unlinkPostFromEvent').mockRejectedValue(new Error('Delete failed'));

      await expect(service.unlinkPostFromEvent('post-1', 'event-1')).rejects.toMatchObject({
        code: 'DATABASE_ERROR',
      });
    });
  });

  // ─── getEventRelatedToPost ────────────────────────────────────────────────

  describe('getEventRelatedToPost()', () => {
    it('should return the event id when a link exists', async () => {
      const getEventRelatedToPostSpy = jest.spyOn(mockRepository, 'getEventRelatedToPost').mockResolvedValue('event-1');

      const result = await service.getEventRelatedToPost('post-1');

      expect(result).toBe('event-1');
      expect(getEventRelatedToPostSpy).toHaveBeenCalledWith('post-1');
    });

    it('should return null when no event is linked to the post', async () => {
      jest.spyOn(mockRepository, 'getEventRelatedToPost').mockResolvedValue(null);

      const result = await service.getEventRelatedToPost('post-unlinked');

      expect(result).toBeNull();
    });

    it('should throw DATABASE_ERROR on a generic repository failure', async () => {
      jest.spyOn(mockRepository, 'getEventRelatedToPost').mockRejectedValue(new Error('Query failed'));

      await expect(service.getEventRelatedToPost('post-1')).rejects.toMatchObject({
        code: 'DATABASE_ERROR',
      });
    });
  });

  // ─── getEventPosts ────────────────────────────────────────────────────────

  describe('getEventPosts()', () => {
    it('should return paginated post ids for the event', async () => {
      const expected = PaginatedIdsFactory.buildWithRandomIds(3);
      const getEventPostsSpy = jest.spyOn(mockRepository, 'getEventPosts').mockResolvedValue(expected);

      const result = await service.getEventPosts('event-1', PAGINATION);

      expect(result).toEqual(expected);
      expect(getEventPostsSpy).toHaveBeenCalledWith('event-1', PAGINATION);
    });

    it('should return empty result when event has no linked posts', async () => {
      jest.spyOn(mockRepository, 'getEventPosts').mockResolvedValue(PaginatedIdsFactory.buildEmpty());

      const result = await service.getEventPosts('event-1', PAGINATION);

      expect(result.ids).toHaveLength(0);
    });

    it('should throw DATABASE_ERROR on a generic repository failure', async () => {
      jest.spyOn(mockRepository, 'getEventPosts').mockRejectedValue(new Error('Query failed'));

      await expect(service.getEventPosts('event-1', PAGINATION)).rejects.toMatchObject({
        code: 'DATABASE_ERROR',
      });
    });
  });
});
