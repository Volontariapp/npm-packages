import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { PublicationService } from '../../services/publication.service.js';
import type { IPublicationRepository } from '../../repositories/interfaces/publication.repository.js';
import { createPublicationRepositoryMock } from '../__test-utils__/mocks/publication.repository.mock.js';
import { PaginatedIdsFactory } from '../__test-utils__/factories/paginated-ids.factory.js';
import { UserIdFactory, PostIdFactory } from '../__test-utils__/factories/ids.factory.js';
import { PaginationFactory } from '../__test-utils__/factories/pagination.factory.js';
import { SocialUserFactory } from '../__test-utils__/factories/social-user.factory.js';
import { SocialPostFactory } from '../__test-utils__/factories/social-post.factory.js';

const PAGINATION = PaginationFactory.build();

describe('PublicationService (Unit)', () => {
  let service: PublicationService;
  let mockRepository: jest.Mocked<IPublicationRepository>;

  beforeEach(() => {
    mockRepository = createPublicationRepositoryMock();
    service = new PublicationService(mockRepository);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ─── createPost ───────────────────────────────────────────────────────────

  describe('createPost()', () => {
    it('should call repository.createPostNode with the entity if not exists', async () => {
      const postId = PostIdFactory.build('post-1');
      const postEntity = SocialPostFactory.build({ postId: 'post-1' });
      const postExistsSpy = jest.spyOn(mockRepository, 'postExists').mockResolvedValue(false);
      const createPostNodeSpy = jest
        .spyOn(mockRepository, 'createPostNode')
        .mockResolvedValue(undefined);

      await service.createPost(postId);

      expect(postExistsSpy).toHaveBeenCalledWith(postEntity);
      expect(createPostNodeSpy).toHaveBeenCalledWith(postEntity);
    });

    it('should throw SOCIAL_POST_ALREADY_EXISTS if post already exists', async () => {
      jest.spyOn(mockRepository, 'postExists').mockResolvedValue(true);
      const createPostNodeSpy = jest.spyOn(mockRepository, 'createPostNode');

      await expect(service.createPost(PostIdFactory.build('post-1'))).rejects.toMatchObject({
        code: 'CONFLICT',
      });
      expect(createPostNodeSpy).not.toHaveBeenCalled();
    });

    it('should throw DATABASE_ERROR on a generic repository failure', async () => {
      jest.spyOn(mockRepository, 'postExists').mockResolvedValue(false);
      jest.spyOn(mockRepository, 'createPostNode').mockRejectedValue(new Error('Write failed'));

      await expect(service.createPost(PostIdFactory.build('post-1'))).rejects.toMatchObject({
        code: 'DATABASE_ERROR',
      });
    });

    it('should rethrow a BaseError without wrapping', async () => {
      jest.spyOn(mockRepository, 'postExists').mockResolvedValue(false);
      jest.spyOn(mockRepository, 'createPostNode').mockRejectedValue({
        code: 'DATABASE_QUERY_ERROR',
        isBaseError: true,
      });

      await expect(service.createPost(PostIdFactory.build('post-1'))).rejects.toMatchObject({
        isBaseError: true,
      });
    });
  });

  // ─── deletePost ───────────────────────────────────────────────────────────

  describe('deletePost()', () => {
    it('should call repository.deletePostNode with the entity if it exists', async () => {
      const postId = PostIdFactory.build('post-1');
      const postEntity = SocialPostFactory.build({ postId: 'post-1' });
      const postExistsSpy = jest.spyOn(mockRepository, 'postExists').mockResolvedValue(true);
      const deletePostNodeSpy = jest
        .spyOn(mockRepository, 'deletePostNode')
        .mockResolvedValue(undefined);

      await service.deletePost(postId);

      expect(postExistsSpy).toHaveBeenCalledWith(postEntity);
      expect(deletePostNodeSpy).toHaveBeenCalledWith(postEntity);
    });

    it('should throw SOCIAL_POST_NOT_FOUND if post does not exist', async () => {
      jest.spyOn(mockRepository, 'postExists').mockResolvedValue(false);

      await expect(service.deletePost(PostIdFactory.build('post-1'))).rejects.toMatchObject({
        code: 'NOT_FOUND',
      });
    });

    it('should throw DATABASE_ERROR on a generic repository failure', async () => {
      jest.spyOn(mockRepository, 'postExists').mockResolvedValue(true);
      jest.spyOn(mockRepository, 'deletePostNode').mockRejectedValue(new Error('Delete failed'));

      await expect(service.deletePost(PostIdFactory.build('post-1'))).rejects.toMatchObject({
        code: 'DATABASE_ERROR',
      });
    });
  });

  // ─── getPostExists ────────────────────────────────────────────────────────

  describe('getPostExists()', () => {
    it('should return true when the post node exists', async () => {
      const postId = PostIdFactory.build('post-1');
      const postEntity = SocialPostFactory.build({ postId: 'post-1' });
      const postExistsSpy = jest.spyOn(mockRepository, 'postExists').mockResolvedValue(true);

      const result = await service.getPostExists(postId);

      expect(result).toBe(true);
      expect(postExistsSpy).toHaveBeenCalledWith(postEntity);
    });

    it('should return false when the post node does not exist', async () => {
      jest.spyOn(mockRepository, 'postExists').mockResolvedValue(false);

      const result = await service.getPostExists(PostIdFactory.build('post-missing'));

      expect(result).toBe(false);
    });

    it('should throw DATABASE_ERROR on a generic repository failure', async () => {
      jest.spyOn(mockRepository, 'postExists').mockRejectedValue(new Error('Query failed'));

      await expect(service.getPostExists(PostIdFactory.build('post-1'))).rejects.toMatchObject({
        code: 'DATABASE_ERROR',
      });
    });
  });

  // ─── ownPost ──────────────────────────────────────────────────────────────

  describe('ownPost()', () => {
    it('should call repository.createOwnership with correct entities', async () => {
      const userEntity = SocialUserFactory.build({ userId: 'user-1' });
      const postEntity = SocialPostFactory.build({ postId: 'post-1' });
      const createOwnershipSpy = jest
        .spyOn(mockRepository, 'createOwnership')
        .mockResolvedValue(undefined);

      await service.ownPost(UserIdFactory.build('user-1'), PostIdFactory.build('post-1'));

      expect(createOwnershipSpy).toHaveBeenCalledWith(userEntity, postEntity);
    });

    it('should throw DATABASE_ERROR on a generic repository failure', async () => {
      jest.spyOn(mockRepository, 'createOwnership').mockRejectedValue(new Error('Merge failed'));

      await expect(
        service.ownPost(UserIdFactory.build('user-1'), PostIdFactory.build('post-1')),
      ).rejects.toMatchObject({ code: 'DATABASE_ERROR' });
    });
  });

  // ─── disownPost ───────────────────────────────────────────────────────────

  describe('disownPost()', () => {
    it('should call repository.deleteOwnership with correct entities', async () => {
      const userEntity = SocialUserFactory.build({ userId: 'user-1' });
      const postEntity = SocialPostFactory.build({ postId: 'post-1' });
      const deleteOwnershipSpy = jest
        .spyOn(mockRepository, 'deleteOwnership')
        .mockResolvedValue(undefined);

      await service.disownPost(UserIdFactory.build('user-1'), PostIdFactory.build('post-1'));

      expect(deleteOwnershipSpy).toHaveBeenCalledWith(userEntity, postEntity);
    });

    it('should throw DATABASE_ERROR on a generic repository failure', async () => {
      jest.spyOn(mockRepository, 'deleteOwnership').mockRejectedValue(new Error('Delete failed'));

      await expect(
        service.disownPost(UserIdFactory.build('user-1'), PostIdFactory.build('post-1')),
      ).rejects.toMatchObject({ code: 'DATABASE_ERROR' });
    });
  });

  // ─── getUserPosts ─────────────────────────────────────────────────────────

  describe('getUserPosts()', () => {
    it('should return paginated post ids from the repository', async () => {
      const userEntity = SocialUserFactory.build({ userId: 'user-1' });
      const expected = PaginatedIdsFactory.buildWithRandomIds(3);
      const getUserPostsSpy = jest
        .spyOn(mockRepository, 'getUserPosts')
        .mockResolvedValue(expected);

      const result = await service.getUserPosts(UserIdFactory.build('user-1'), PAGINATION);

      expect(result).toEqual(expected);
      expect(getUserPostsSpy).toHaveBeenCalledWith(userEntity, PAGINATION);
    });

    it('should return empty result when user has no posts', async () => {
      jest
        .spyOn(mockRepository, 'getUserPosts')
        .mockResolvedValue(PaginatedIdsFactory.buildEmpty());

      const result = await service.getUserPosts(UserIdFactory.build('user-1'), PAGINATION);

      expect(result.ids).toHaveLength(0);
    });

    it('should throw DATABASE_ERROR on a generic repository failure', async () => {
      jest.spyOn(mockRepository, 'getUserPosts').mockRejectedValue(new Error('Query failed'));

      await expect(
        service.getUserPosts(UserIdFactory.build('user-1'), PAGINATION),
      ).rejects.toMatchObject({ code: 'DATABASE_ERROR' });
    });
  });

  // ─── getFeed ──────────────────────────────────────────────────────────────

  describe('getFeed()', () => {
    it('should return paginated feed post ids from the repository', async () => {
      const userEntity = SocialUserFactory.build({ userId: 'user-1' });
      const expected = PaginatedIdsFactory.buildWithRandomIds(5);
      const getFeedSpy = jest.spyOn(mockRepository, 'getFeed').mockResolvedValue(expected);

      const result = await service.getFeed(UserIdFactory.build('user-1'), PAGINATION);

      expect(result).toEqual(expected);
      expect(getFeedSpy).toHaveBeenCalledWith(userEntity, PAGINATION);
    });

    it('should return empty feed when user follows nobody', async () => {
      jest.spyOn(mockRepository, 'getFeed').mockResolvedValue(PaginatedIdsFactory.buildEmpty());

      const result = await service.getFeed(UserIdFactory.build('user-1'), PAGINATION);

      expect(result.ids).toHaveLength(0);
    });

    it('should throw DATABASE_ERROR on a generic repository failure', async () => {
      jest.spyOn(mockRepository, 'getFeed').mockRejectedValue(new Error('Graph traversal failed'));

      await expect(
        service.getFeed(UserIdFactory.build('user-1'), PAGINATION),
      ).rejects.toMatchObject({ code: 'DATABASE_ERROR' });
    });
  });
});
