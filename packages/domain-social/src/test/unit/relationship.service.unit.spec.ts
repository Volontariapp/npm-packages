import type { jest } from '@jest/globals';
import { describe, it, expect, beforeEach } from '@jest/globals';
import { RelationshipService } from '../../services/relationship.service.js';
import type { IRelationshipRepository } from '../../repositories/interfaces/relationship.repository.js';
import { createRelationshipRepositoryMock } from '../__test-utils__/mocks/relationship.repository.mock.js';
import { PaginatedIdsFactory } from '../__test-utils__/factories/paginated-ids.factory.js';

const PAGINATION = { page: 1, limit: 10 };

describe('RelationshipService (Unit)', () => {
  let service: RelationshipService;
  let mockRepository: jest.Mocked<IRelationshipRepository>;

  beforeEach(() => {
    mockRepository = createRelationshipRepositoryMock();
    service = new RelationshipService(mockRepository);
  });

  // ─── followUser ───────────────────────────────────────────────────────────

  describe('followUser()', () => {
    it('should call repository.createFollow with correct args', async () => {
      mockRepository.createFollow.mockResolvedValue(undefined);

      await service.followUser('follower-1', 'followed-1');

      expect(mockRepository.createFollow).toHaveBeenCalledWith('follower-1', 'followed-1');
    });

    it('should throw DATABASE_ERROR on a generic repository failure', async () => {
      mockRepository.createFollow.mockRejectedValue(new Error('Neo4j error'));

      await expect(service.followUser('f1', 'f2')).rejects.toMatchObject({
        code: 'DATABASE_ERROR',
      });
    });

    it('should rethrow a BaseError without wrapping', async () => {
      mockRepository.createFollow.mockRejectedValue({
        code: 'DATABASE_QUERY_ERROR',
        isBaseError: true,
      });

      await expect(service.followUser('f1', 'f2')).rejects.toMatchObject({ isBaseError: true });
    });
  });

  // ─── unfollowUser ─────────────────────────────────────────────────────────

  describe('unfollowUser()', () => {
    it('should call repository.deleteFollow with correct args', async () => {
      mockRepository.deleteFollow.mockResolvedValue(undefined);

      await service.unfollowUser('follower-1', 'followed-1');

      expect(mockRepository.deleteFollow).toHaveBeenCalledWith('follower-1', 'followed-1');
    });

    it('should throw DATABASE_ERROR on a generic repository failure', async () => {
      mockRepository.deleteFollow.mockRejectedValue(new Error('Neo4j error'));

      await expect(service.unfollowUser('f1', 'f2')).rejects.toMatchObject({
        code: 'DATABASE_ERROR',
      });
    });
  });

  // ─── blockUser ────────────────────────────────────────────────────────────

  describe('blockUser()', () => {
    it('should call repository.createBlock with correct args', async () => {
      mockRepository.createBlock.mockResolvedValue(undefined);

      await service.blockUser('blocker-1', 'blocked-1');

      expect(mockRepository.createBlock).toHaveBeenCalledWith('blocker-1', 'blocked-1');
    });

    it('should throw DATABASE_ERROR on a generic repository failure', async () => {
      mockRepository.createBlock.mockRejectedValue(new Error('Neo4j error'));

      await expect(service.blockUser('b1', 'b2')).rejects.toMatchObject({
        code: 'DATABASE_ERROR',
      });
    });
  });

  // ─── unblockUser ──────────────────────────────────────────────────────────

  describe('unblockUser()', () => {
    it('should call repository.deleteBlock with correct args', async () => {
      mockRepository.deleteBlock.mockResolvedValue(undefined);

      await service.unblockUser('blocker-1', 'blocked-1');

      expect(mockRepository.deleteBlock).toHaveBeenCalledWith('blocker-1', 'blocked-1');
    });

    it('should throw DATABASE_ERROR on a generic repository failure', async () => {
      mockRepository.deleteBlock.mockRejectedValue(new Error('Neo4j error'));

      await expect(service.unblockUser('b1', 'b2')).rejects.toMatchObject({
        code: 'DATABASE_ERROR',
      });
    });
  });

  // ─── getFollows ───────────────────────────────────────────────────────────

  describe('getFollows()', () => {
    it('should return paginated follows from the repository', async () => {
      const expected = PaginatedIdsFactory.buildWithRandomIds(2);
      mockRepository.getFollows.mockResolvedValue(expected);

      const result = await service.getFollows('user-1', PAGINATION);

      expect(result).toEqual(expected);
      expect(mockRepository.getFollows).toHaveBeenCalledWith('user-1', PAGINATION);
    });

    it('should return empty result when no follows exist', async () => {
      mockRepository.getFollows.mockResolvedValue(PaginatedIdsFactory.buildEmpty());

      const result = await service.getFollows('user-1', PAGINATION);

      expect(result.ids).toHaveLength(0);
    });

    it('should throw DATABASE_ERROR on a generic repository failure', async () => {
      mockRepository.getFollows.mockRejectedValue(new Error('Query failed'));

      await expect(service.getFollows('user-1', PAGINATION)).rejects.toMatchObject({
        code: 'DATABASE_ERROR',
      });
    });
  });

  // ─── getFollowers ─────────────────────────────────────────────────────────

  describe('getFollowers()', () => {
    it('should return paginated followers from the repository', async () => {
      const expected = PaginatedIdsFactory.buildWithRandomIds(3);
      mockRepository.getFollowers.mockResolvedValue(expected);

      const result = await service.getFollowers('user-1', PAGINATION);

      expect(result).toEqual(expected);
    });

    it('should throw DATABASE_ERROR on a generic repository failure', async () => {
      mockRepository.getFollowers.mockRejectedValue(new Error('Query failed'));

      await expect(service.getFollowers('user-1', PAGINATION)).rejects.toMatchObject({
        code: 'DATABASE_ERROR',
      });
    });
  });

  // ─── getBlocks ────────────────────────────────────────────────────────────

  describe('getBlocks()', () => {
    it('should return paginated blocks from the repository', async () => {
      const expected = PaginatedIdsFactory.buildWithRandomIds(1);
      mockRepository.getBlocks.mockResolvedValue(expected);

      const result = await service.getBlocks('user-1', PAGINATION);

      expect(result).toEqual(expected);
    });

    it('should throw DATABASE_ERROR on a generic repository failure', async () => {
      mockRepository.getBlocks.mockRejectedValue(new Error('Query failed'));

      await expect(service.getBlocks('user-1', PAGINATION)).rejects.toMatchObject({
        code: 'DATABASE_ERROR',
      });
    });
  });

  // ─── getWhoBlockedMe ──────────────────────────────────────────────────────

  describe('getWhoBlockedMe()', () => {
    it('should return paginated users who blocked me from the repository', async () => {
      const expected = PaginatedIdsFactory.buildWithRandomIds(2);
      mockRepository.getWhoBlockedMe.mockResolvedValue(expected);

      const result = await service.getWhoBlockedMe('user-1', PAGINATION);

      expect(result).toEqual(expected);
    });

    it('should throw DATABASE_ERROR on a generic repository failure', async () => {
      mockRepository.getWhoBlockedMe.mockRejectedValue(new Error('Query failed'));

      await expect(service.getWhoBlockedMe('user-1', PAGINATION)).rejects.toMatchObject({
        code: 'DATABASE_ERROR',
      });
    });
  });
});
