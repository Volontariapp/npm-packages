import type { jest } from '@jest/globals';
import { describe, it, expect, beforeEach } from '@jest/globals';
import { InteractionService } from '../../services/interaction.service.js';
import type { IInteractionRepository } from '../../repositories/interfaces/interaction.repository.js';
import { createInteractionRepositoryMock } from '../__test-utils__/mocks/interaction.repository.mock.js';
import { PaginatedIdsFactory } from '../__test-utils__/factories/paginated-ids.factory.js';

const PAGINATION = { page: 1, limit: 10 };

describe('InteractionService (Unit)', () => {
  let service: InteractionService;
  let mockRepository: jest.Mocked<IInteractionRepository>;

  beforeEach(() => {
    mockRepository = createInteractionRepositoryMock();
    service = new InteractionService(mockRepository);
  });

  // ─── likePost ─────────────────────────────────────────────────────────────

  describe('likePost()', () => {
    it('should call repository.createLike with correct args', async () => {
      mockRepository.createLike.mockResolvedValue(undefined);

      await service.likePost('user-1', 'post-1');

      expect(mockRepository.createLike).toHaveBeenCalledWith('user-1', 'post-1');
    });

    it('should throw DATABASE_ERROR on a generic repository failure', async () => {
      mockRepository.createLike.mockRejectedValue(new Error('Merge failed'));

      await expect(service.likePost('user-1', 'post-1')).rejects.toMatchObject({
        code: 'DATABASE_ERROR',
      });
    });

    it('should rethrow a BaseError without wrapping', async () => {
      mockRepository.createLike.mockRejectedValue({
        code: 'DATABASE_QUERY_ERROR',
        isBaseError: true,
      });

      await expect(service.likePost('user-1', 'post-1')).rejects.toMatchObject({
        isBaseError: true,
      });
    });
  });

  // ─── unlikePost ───────────────────────────────────────────────────────────

  describe('unlikePost()', () => {
    it('should call repository.deleteLike with correct args', async () => {
      mockRepository.deleteLike.mockResolvedValue(undefined);

      await service.unlikePost('user-1', 'post-1');

      expect(mockRepository.deleteLike).toHaveBeenCalledWith('user-1', 'post-1');
    });

    it('should throw DATABASE_ERROR on a generic repository failure', async () => {
      mockRepository.deleteLike.mockRejectedValue(new Error('Delete failed'));

      await expect(service.unlikePost('user-1', 'post-1')).rejects.toMatchObject({
        code: 'DATABASE_ERROR',
      });
    });
  });

  // ─── getUserLikes ─────────────────────────────────────────────────────────

  describe('getUserLikes()', () => {
    it('should return paginated liked post ids', async () => {
      const expected = PaginatedIdsFactory.buildWithRandomIds(4);
      mockRepository.getUserLikes.mockResolvedValue(expected);

      const result = await service.getUserLikes('user-1', PAGINATION);

      expect(result).toEqual(expected);
      expect(mockRepository.getUserLikes).toHaveBeenCalledWith('user-1', PAGINATION);
    });

    it('should return empty result when user has no likes', async () => {
      mockRepository.getUserLikes.mockResolvedValue(PaginatedIdsFactory.buildEmpty());

      const result = await service.getUserLikes('user-1', PAGINATION);

      expect(result.ids).toHaveLength(0);
    });

    it('should throw DATABASE_ERROR on a generic repository failure', async () => {
      mockRepository.getUserLikes.mockRejectedValue(new Error('Query failed'));

      await expect(service.getUserLikes('user-1', PAGINATION)).rejects.toMatchObject({
        code: 'DATABASE_ERROR',
      });
    });
  });

  // ─── getPostLikers ────────────────────────────────────────────────────────

  describe('getPostLikers()', () => {
    it('should return paginated user ids who liked the post', async () => {
      const expected = PaginatedIdsFactory.buildWithRandomIds(2);
      mockRepository.getPostLikers.mockResolvedValue(expected);

      const result = await service.getPostLikers('post-1', PAGINATION);

      expect(result).toEqual(expected);
      expect(mockRepository.getPostLikers).toHaveBeenCalledWith('post-1', PAGINATION);
    });

    it('should return empty result when post has no likers', async () => {
      mockRepository.getPostLikers.mockResolvedValue(PaginatedIdsFactory.buildEmpty());

      const result = await service.getPostLikers('post-1', PAGINATION);

      expect(result.ids).toHaveLength(0);
    });

    it('should throw DATABASE_ERROR on a generic repository failure', async () => {
      mockRepository.getPostLikers.mockRejectedValue(new Error('Query failed'));

      await expect(service.getPostLikers('post-1', PAGINATION)).rejects.toMatchObject({
        code: 'DATABASE_ERROR',
      });
    });
  });
});
