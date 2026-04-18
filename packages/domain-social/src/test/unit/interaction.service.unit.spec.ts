import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { InteractionService } from '../../services/interaction.service.js';
import type { IInteractionRepository } from '../../repositories/interfaces/interaction.repository.js';
import { createInteractionRepositoryMock } from '../__test-utils__/mocks/interaction.repository.mock.js';
import { PaginatedIdsFactory } from '../__test-utils__/factories/paginated-ids.factory.js';
import { UserIdFactory, PostIdFactory } from '../__test-utils__/factories/ids.factory.js';
import { PaginationFactory } from '../__test-utils__/factories/pagination.factory.js';
import { SocialUserFactory } from '../__test-utils__/factories/social-user.factory.js';
import { SocialPostFactory } from '../__test-utils__/factories/social-post.factory.js';

const PAGINATION = PaginationFactory.build();

describe('InteractionService (Unit)', () => {
  let service: InteractionService;
  let mockRepository: jest.Mocked<IInteractionRepository>;

  beforeEach(() => {
    mockRepository = createInteractionRepositoryMock();
    service = new InteractionService(mockRepository);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ─── likePost ─────────────────────────────────────────────────────────────

  describe('likePost()', () => {
    it('should call repository.createLike with correct entities if not exists', async () => {
      const userEntity = SocialUserFactory.build({ userId: 'user-1' });
      const postEntity = SocialPostFactory.build({ postId: 'post-1' });
      const likeExistsSpy = jest.spyOn(mockRepository, 'likeExists').mockResolvedValue(false);
      const createLikeSpy = jest.spyOn(mockRepository, 'createLike').mockResolvedValue(undefined);

      await service.likePost(UserIdFactory.build('user-1'), PostIdFactory.build('post-1'));

      expect(likeExistsSpy).toHaveBeenCalledWith(userEntity, postEntity);
      expect(createLikeSpy).toHaveBeenCalledWith(userEntity, postEntity);
    });

    it('should throw SOCIAL_RELATIONSHIP_ALREADY_EXISTS if already liked', async () => {
      jest.spyOn(mockRepository, 'likeExists').mockResolvedValue(true);

      await expect(
        service.likePost(UserIdFactory.build('user-1'), PostIdFactory.build('post-1')),
      ).rejects.toMatchObject({ code: 'CONFLICT' });
    });

    it('should throw DATABASE_ERROR on a generic repository failure', async () => {
      jest.spyOn(mockRepository, 'likeExists').mockResolvedValue(false);
      jest.spyOn(mockRepository, 'createLike').mockRejectedValue(new Error('Merge failed'));

      await expect(
        service.likePost(UserIdFactory.build('user-1'), PostIdFactory.build('post-1')),
      ).rejects.toMatchObject({ code: 'DATABASE_ERROR' });
    });

    it('should rethrow a BaseError without wrapping', async () => {
      jest.spyOn(mockRepository, 'likeExists').mockResolvedValue(false);
      jest.spyOn(mockRepository, 'createLike').mockRejectedValue({
        code: 'DATABASE_QUERY_ERROR',
        isBaseError: true,
      });

      await expect(
        service.likePost(UserIdFactory.build('user-1'), PostIdFactory.build('post-1')),
      ).rejects.toMatchObject({ isBaseError: true });
    });
  });

  // ─── unlikePost ───────────────────────────────────────────────────────────

  describe('unlikePost()', () => {
    it('should call repository.deleteLike with correct entities if exists', async () => {
      const userEntity = SocialUserFactory.build({ userId: 'user-1' });
      const postEntity = SocialPostFactory.build({ postId: 'post-1' });
      const likeExistsSpy = jest.spyOn(mockRepository, 'likeExists').mockResolvedValue(true);
      const deleteLikeSpy = jest.spyOn(mockRepository, 'deleteLike').mockResolvedValue(undefined);

      await service.unlikePost(UserIdFactory.build('user-1'), PostIdFactory.build('post-1'));

      expect(likeExistsSpy).toHaveBeenCalledWith(userEntity, postEntity);
      expect(deleteLikeSpy).toHaveBeenCalledWith(userEntity, postEntity);
    });

    it('should throw SOCIAL_RELATIONSHIP_NOT_FOUND if not liked', async () => {
      jest.spyOn(mockRepository, 'likeExists').mockResolvedValue(false);

      await expect(
        service.unlikePost(UserIdFactory.build('user-1'), PostIdFactory.build('post-1')),
      ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    });

    it('should throw DATABASE_ERROR on a generic repository failure', async () => {
      jest.spyOn(mockRepository, 'likeExists').mockResolvedValue(true);
      jest.spyOn(mockRepository, 'deleteLike').mockRejectedValue(new Error('Delete failed'));

      await expect(
        service.unlikePost(UserIdFactory.build('user-1'), PostIdFactory.build('post-1')),
      ).rejects.toMatchObject({ code: 'DATABASE_ERROR' });
    });
  });

  // ─── getUserLikes ─────────────────────────────────────────────────────────

  describe('getUserLikes()', () => {
    it('should return paginated liked post ids', async () => {
      const userEntity = SocialUserFactory.build({ userId: 'user-1' });
      const expected = PaginatedIdsFactory.buildWithRandomIds(4);
      const getUserLikesSpy = jest
        .spyOn(mockRepository, 'getUserLikes')
        .mockResolvedValue(expected);

      const result = await service.getUserLikes(UserIdFactory.build('user-1'), PAGINATION);

      expect(result).toEqual(expected);
      expect(getUserLikesSpy).toHaveBeenCalledWith(userEntity, PAGINATION);
    });

    it('should return empty result when user has no likes', async () => {
      jest
        .spyOn(mockRepository, 'getUserLikes')
        .mockResolvedValue(PaginatedIdsFactory.buildEmpty());

      const result = await service.getUserLikes(UserIdFactory.build('user-1'), PAGINATION);

      expect(result.ids).toHaveLength(0);
    });

    it('should throw DATABASE_ERROR on a generic repository failure', async () => {
      jest.spyOn(mockRepository, 'getUserLikes').mockRejectedValue(new Error('Query failed'));

      await expect(
        service.getUserLikes(UserIdFactory.build('user-1'), PAGINATION),
      ).rejects.toMatchObject({ code: 'DATABASE_ERROR' });
    });
  });

  // ─── getPostLikers ────────────────────────────────────────────────────────

  describe('getPostLikers()', () => {
    it('should return paginated user ids who liked the post', async () => {
      const postEntity = SocialPostFactory.build({ postId: 'post-1' });
      const expected = PaginatedIdsFactory.buildWithRandomIds(2);
      const getPostLikersSpy = jest
        .spyOn(mockRepository, 'getPostLikers')
        .mockResolvedValue(expected);

      const result = await service.getPostLikers(PostIdFactory.build('post-1'), PAGINATION);

      expect(result).toEqual(expected);
      expect(getPostLikersSpy).toHaveBeenCalledWith(postEntity, PAGINATION);
    });

    it('should return empty result when post has no likers', async () => {
      jest
        .spyOn(mockRepository, 'getPostLikers')
        .mockResolvedValue(PaginatedIdsFactory.buildEmpty());

      const result = await service.getPostLikers(PostIdFactory.build('post-1'), PAGINATION);

      expect(result.ids).toHaveLength(0);
    });

    it('should throw DATABASE_ERROR on a generic repository failure', async () => {
      jest.spyOn(mockRepository, 'getPostLikers').mockRejectedValue(new Error('Query failed'));

      await expect(
        service.getPostLikers(PostIdFactory.build('post-1'), PAGINATION),
      ).rejects.toMatchObject({ code: 'DATABASE_ERROR' });
    });
  });
});
