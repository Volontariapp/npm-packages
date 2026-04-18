import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { EventPostLinkService } from '../../services/event-post-link.service.js';
import type { IEventPostLinkRepository } from '../../repositories/interfaces/event-post-link.repository.js';
import { createEventPostLinkRepositoryMock } from '../__test-utils__/mocks/event-post-link.repository.mock.js';
import { PaginatedIdsFactory } from '../__test-utils__/factories/paginated-ids.factory.js';
import { PostIdFactory, EventIdFactory } from '../__test-utils__/factories/ids.factory.js';
import { PaginationFactory } from '../__test-utils__/factories/pagination.factory.js';
import { SocialPostFactory } from '../__test-utils__/factories/social-post.factory.js';
import { SocialEventFactory } from '../__test-utils__/factories/social-event.factory.js';

const PAGINATION = PaginationFactory.build();

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
    it('should call repository.linkPostToEvent with correct entities', async () => {
      const postEntity = SocialPostFactory.build({ postId: 'post-1' });
      const eventEntity = SocialEventFactory.build({ eventId: 'event-1' });
      const linkPostToEventSpy = jest
        .spyOn(mockRepository, 'linkPostToEvent')
        .mockResolvedValue(undefined);

      await service.linkPostToEvent(PostIdFactory.build('post-1'), EventIdFactory.build('event-1'));

      expect(linkPostToEventSpy).toHaveBeenCalledWith(postEntity, eventEntity);
    });

    it('should throw DATABASE_ERROR on a generic repository failure', async () => {
      jest.spyOn(mockRepository, 'linkPostToEvent').mockRejectedValue(new Error('Merge failed'));

      await expect(
        service.linkPostToEvent(PostIdFactory.build('post-1'), EventIdFactory.build('event-1')),
      ).rejects.toMatchObject({ code: 'DATABASE_ERROR' });
    });

    it('should rethrow a BaseError without wrapping', async () => {
      jest.spyOn(mockRepository, 'linkPostToEvent').mockRejectedValue({
        code: 'DATABASE_QUERY_ERROR',
        isBaseError: true,
      });

      await expect(
        service.linkPostToEvent(PostIdFactory.build('post-1'), EventIdFactory.build('event-1')),
      ).rejects.toMatchObject({ isBaseError: true });
    });
  });

  // ─── unlinkPostFromEvent ──────────────────────────────────────────────────

  describe('unlinkPostFromEvent()', () => {
    it('should call repository.unlinkPostFromEvent with correct entities', async () => {
      const postEntity = SocialPostFactory.build({ postId: 'post-1' });
      const eventEntity = SocialEventFactory.build({ eventId: 'event-1' });
      const unlinkPostFromEventSpy = jest
        .spyOn(mockRepository, 'unlinkPostFromEvent')
        .mockResolvedValue(undefined);

      await service.unlinkPostFromEvent(
        PostIdFactory.build('post-1'),
        EventIdFactory.build('event-1'),
      );

      expect(unlinkPostFromEventSpy).toHaveBeenCalledWith(postEntity, eventEntity);
    });

    it('should throw DATABASE_ERROR on a generic repository failure', async () => {
      jest
        .spyOn(mockRepository, 'unlinkPostFromEvent')
        .mockRejectedValue(new Error('Delete failed'));

      await expect(
        service.unlinkPostFromEvent(PostIdFactory.build('post-1'), EventIdFactory.build('event-1')),
      ).rejects.toMatchObject({ code: 'DATABASE_ERROR' });
    });
  });

  // ─── getEventRelatedToPost ────────────────────────────────────────────────

  describe('getEventRelatedToPost()', () => {
    it('should return the event id when a link exists', async () => {
      const postEntity = SocialPostFactory.build({ postId: 'post-1' });
      const getEventRelatedToPostSpy = jest
        .spyOn(mockRepository, 'getEventRelatedToPost')
        .mockResolvedValue('event-1');

      const result = await service.getEventRelatedToPost(PostIdFactory.build('post-1'));

      expect(result).toBe('event-1');
      expect(getEventRelatedToPostSpy).toHaveBeenCalledWith(postEntity);
    });

    it('should return null when no event is linked to the post', async () => {
      jest.spyOn(mockRepository, 'getEventRelatedToPost').mockResolvedValue(null);

      const result = await service.getEventRelatedToPost(PostIdFactory.build('post-unlinked'));

      expect(result).toBeNull();
    });

    it('should throw DATABASE_ERROR on a generic repository failure', async () => {
      jest
        .spyOn(mockRepository, 'getEventRelatedToPost')
        .mockRejectedValue(new Error('Query failed'));

      await expect(
        service.getEventRelatedToPost(PostIdFactory.build('post-1')),
      ).rejects.toMatchObject({ code: 'DATABASE_ERROR' });
    });
  });

  // ─── getEventPosts ────────────────────────────────────────────────────────

  describe('getEventPosts()', () => {
    it('should return paginated post ids for the event', async () => {
      const eventEntity = SocialEventFactory.build({ eventId: 'event-1' });
      const expected = PaginatedIdsFactory.buildWithRandomIds(3);
      const getEventPostsSpy = jest
        .spyOn(mockRepository, 'getEventPosts')
        .mockResolvedValue(expected);

      const result = await service.getEventPosts(EventIdFactory.build('event-1'), PAGINATION);

      expect(result).toEqual(expected);
      expect(getEventPostsSpy).toHaveBeenCalledWith(eventEntity, PAGINATION);
    });

    it('should return empty result when event has no linked posts', async () => {
      jest
        .spyOn(mockRepository, 'getEventPosts')
        .mockResolvedValue(PaginatedIdsFactory.buildEmpty());

      const result = await service.getEventPosts(EventIdFactory.build('event-1'), PAGINATION);

      expect(result.ids).toHaveLength(0);
    });

    it('should throw DATABASE_ERROR on a generic repository failure', async () => {
      jest.spyOn(mockRepository, 'getEventPosts').mockRejectedValue(new Error('Query failed'));

      await expect(
        service.getEventPosts(EventIdFactory.build('event-1'), PAGINATION),
      ).rejects.toMatchObject({ code: 'DATABASE_ERROR' });
    });
  });
});
