import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { PublicationService } from '../../services/publication.service.js';
import type { IPublicationRepository } from '../../repositories/interfaces/publication.repository.js';
import { createPublicationRepositoryMock } from '../__test-utils__/mocks/publication.repository.mock.js';
import { PaginatedIdsFactory } from '../__test-utils__/factories/paginated-ids.factory.js';

const PAGINATION = { page: 1, limit: 10 };

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
    it('should call repository.createPostNode with the postId if not exists', async () => {
      const postExistsSpy = jest.spyOn(mockRepository, 'postExists').mockResolvedValue(false);
      const createPostNodeSpy = jest
        .spyOn(mockRepository, 'createPostNode')
        .mockResolvedValue(undefined);

      await service.createPost('post-1');

      expect(postExistsSpy).toHaveBeenCalledWith('post-1');
      expect(createPostNodeSpy).toHaveBeenCalledWith('post-1');
    });

    it('should throw SOCIAL_POST_ALREADY_EXISTS if post already exists', async () => {
      jest.spyOn(mockRepository, 'postExists').mockResolvedValue(true);

      await expect(service.createPost('post-1')).rejects.toMatchObject({
        code: 'CONFLICT',
      });
    });

    it('should throw DATABASE_ERROR on a generic repository failure', async () => {
      jest.spyOn(mockRepository, 'postExists').mockResolvedValue(false);
      jest.spyOn(mockRepository, 'createPostNode').mockRejectedValue(new Error('Write failed'));

      await expect(service.createPost('post-1')).rejects.toMatchObject({
        code: 'DATABASE_ERROR',
      });
    });

    it('should rethrow a BaseError without wrapping', async () => {
      jest.spyOn(mockRepository, 'createPostNode').mockRejectedValue({
        code: 'DATABASE_QUERY_ERROR',
        isBaseError: true,
      });

      await expect(service.createPost('post-1')).rejects.toMatchObject({ isBaseError: true });
    });
  });

  // ─── deletePost ───────────────────────────────────────────────────────────

  describe('deletePost()', () => {
    it('should call repository.deletePostNode with the postId if it exists', async () => {
      const postExistsSpy = jest.spyOn(mockRepository, 'postExists').mockResolvedValue(true);
      const deletePostNodeSpy = jest
        .spyOn(mockRepository, 'deletePostNode')
        .mockResolvedValue(undefined);

      await service.deletePost('post-1');

      expect(postExistsSpy).toHaveBeenCalledWith('post-1');
      expect(deletePostNodeSpy).toHaveBeenCalledWith('post-1');
    });

    it('should throw SOCIAL_POST_NOT_FOUND if post does not exist', async () => {
      jest.spyOn(mockRepository, 'postExists').mockResolvedValue(false);

      await expect(service.deletePost('post-1')).rejects.toMatchObject({
        code: 'NOT_FOUND',
      });
    });

    it('should throw DATABASE_ERROR on a generic repository failure', async () => {
      jest.spyOn(mockRepository, 'postExists').mockResolvedValue(true);
      jest.spyOn(mockRepository, 'deletePostNode').mockRejectedValue(new Error('Delete failed'));

      await expect(service.deletePost('post-1')).rejects.toMatchObject({ code: 'DATABASE_ERROR' });
    });
  });

  // ─── getPostExists ────────────────────────────────────────────────────────

  describe('getPostExists()', () => {
    it('should return true when the post node exists', async () => {
      jest.spyOn(mockRepository, 'postExists').mockResolvedValue(true);

      const result = await service.getPostExists('post-1');

      expect(result).toBe(true);
    });

    it('should return false when the post node does not exist', async () => {
      jest.spyOn(mockRepository, 'postExists').mockResolvedValue(false);

      const result = await service.getPostExists('post-missing');

      expect(result).toBe(false);
    });

    it('should throw DATABASE_ERROR on a generic repository failure', async () => {
      jest.spyOn(mockRepository, 'postExists').mockRejectedValue(new Error('Query failed'));

      await expect(service.getPostExists('post-1')).rejects.toMatchObject({
        code: 'DATABASE_ERROR',
      });
    });
  });

  // ─── ownPost ──────────────────────────────────────────────────────────────

  describe('ownPost()', () => {
    it('should call repository.createOwnership with correct args', async () => {
      const createOwnershipSpy = jest
        .spyOn(mockRepository, 'createOwnership')
        .mockResolvedValue(undefined);

      await service.ownPost('user-1', 'post-1');

      expect(createOwnershipSpy).toHaveBeenCalledWith('user-1', 'post-1');
    });

    it('should throw DATABASE_ERROR on a generic repository failure', async () => {
      jest.spyOn(mockRepository, 'createOwnership').mockRejectedValue(new Error('Merge failed'));

      await expect(service.ownPost('user-1', 'post-1')).rejects.toMatchObject({
        code: 'DATABASE_ERROR',
      });
    });
  });

  // ─── disownPost ───────────────────────────────────────────────────────────

  describe('disownPost()', () => {
    it('should call repository.deleteOwnership with correct args', async () => {
      const deleteOwnershipSpy = jest
        .spyOn(mockRepository, 'deleteOwnership')
        .mockResolvedValue(undefined);

      await service.disownPost('user-1', 'post-1');

      expect(deleteOwnershipSpy).toHaveBeenCalledWith('user-1', 'post-1');
    });

    it('should throw DATABASE_ERROR on a generic repository failure', async () => {
      jest.spyOn(mockRepository, 'deleteOwnership').mockRejectedValue(new Error('Delete failed'));

      await expect(service.disownPost('user-1', 'post-1')).rejects.toMatchObject({
        code: 'DATABASE_ERROR',
      });
    });
  });

  // ─── getUserPosts ─────────────────────────────────────────────────────────

  describe('getUserPosts()', () => {
    it('should return paginated post ids from the repository', async () => {
      const expected = PaginatedIdsFactory.buildWithRandomIds(3);
      const getUserPostsSpy = jest
        .spyOn(mockRepository, 'getUserPosts')
        .mockResolvedValue(expected);

      const result = await service.getUserPosts('user-1', PAGINATION);

      expect(result).toEqual(expected);
      expect(getUserPostsSpy).toHaveBeenCalledWith('user-1', PAGINATION);
    });

    it('should return empty result when user has no posts', async () => {
      jest
        .spyOn(mockRepository, 'getUserPosts')
        .mockResolvedValue(PaginatedIdsFactory.buildEmpty());

      const result = await service.getUserPosts('user-1', PAGINATION);

      expect(result.ids).toHaveLength(0);
    });

    it('should throw DATABASE_ERROR on a generic repository failure', async () => {
      jest.spyOn(mockRepository, 'getUserPosts').mockRejectedValue(new Error('Query failed'));

      await expect(service.getUserPosts('user-1', PAGINATION)).rejects.toMatchObject({
        code: 'DATABASE_ERROR',
      });
    });
  });

  // ─── getFeed ──────────────────────────────────────────────────────────────

  describe('getFeed()', () => {
    it('should return paginated feed post ids from the repository', async () => {
      const expected = PaginatedIdsFactory.buildWithRandomIds(5);
      const getFeedSpy = jest.spyOn(mockRepository, 'getFeed').mockResolvedValue(expected);

      const result = await service.getFeed('user-1', PAGINATION);

      expect(result).toEqual(expected);
      expect(getFeedSpy).toHaveBeenCalledWith('user-1', PAGINATION);
    });

    it('should return empty feed when user follows nobody', async () => {
      jest.spyOn(mockRepository, 'getFeed').mockResolvedValue(PaginatedIdsFactory.buildEmpty());

      const result = await service.getFeed('user-1', PAGINATION);

      expect(result.ids).toHaveLength(0);
    });

    it('should throw DATABASE_ERROR on a generic repository failure', async () => {
      jest.spyOn(mockRepository, 'getFeed').mockRejectedValue(new Error('Graph traversal failed'));

      await expect(service.getFeed('user-1', PAGINATION)).rejects.toMatchObject({
        code: 'DATABASE_ERROR',
      });
    });
  });
});
