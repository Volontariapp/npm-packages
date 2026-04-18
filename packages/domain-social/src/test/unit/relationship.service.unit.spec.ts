import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
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

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ─── followUser ───────────────────────────────────────────────────────────

  describe('followUser()', () => {
    it('should call repository.createFollow with correct args if not exists', async () => {
      const relationshipExistsSpy = jest.spyOn(mockRepository, 'relationshipExists').mockResolvedValue(false);
      const createFollowSpy = jest.spyOn(mockRepository, 'createFollow').mockResolvedValue(undefined);

      await service.followUser('follower-1', 'followed-1');

      expect(relationshipExistsSpy).toHaveBeenCalledWith('follower-1', 'followed-1', 'FOLLOW');
      expect(createFollowSpy).toHaveBeenCalledWith('follower-1', 'followed-1');
    });

    it('should throw SOCIAL_RELATIONSHIP_ALREADY_EXISTS if already following', async () => {
      jest.spyOn(mockRepository, 'relationshipExists').mockResolvedValue(true);

      await expect(service.followUser('follower-1', 'followed-1')).rejects.toMatchObject({
        code: 'CONFLICT',
      });
    });

    it('should throw DATABASE_ERROR on a generic repository failure', async () => {
      jest.spyOn(mockRepository, 'relationshipExists').mockResolvedValue(false);
      jest.spyOn(mockRepository, 'createFollow').mockRejectedValue(new Error('Neo4j error'));

      await expect(service.followUser('f1', 'f2')).rejects.toMatchObject({
        code: 'DATABASE_ERROR',
      });
    });

    it('should rethrow a BaseError without wrapping', async () => {
      jest.spyOn(mockRepository, 'createFollow').mockRejectedValue({
        code: 'DATABASE_QUERY_ERROR',
        isBaseError: true,
      });

      await expect(service.followUser('f1', 'f2')).rejects.toMatchObject({ isBaseError: true });
    });
  });

  // ─── unfollowUser ─────────────────────────────────────────────────────────

  describe('unfollowUser()', () => {
    it('should call repository.deleteFollow with correct args if exists', async () => {
      const relationshipExistsSpy = jest.spyOn(mockRepository, 'relationshipExists').mockResolvedValue(true);
      const deleteFollowSpy = jest.spyOn(mockRepository, 'deleteFollow').mockResolvedValue(undefined);

      await service.unfollowUser('follower-1', 'followed-1');

      expect(relationshipExistsSpy).toHaveBeenCalledWith('follower-1', 'followed-1', 'FOLLOW');
      expect(deleteFollowSpy).toHaveBeenCalledWith('follower-1', 'followed-1');
    });

    it('should throw SOCIAL_RELATIONSHIP_NOT_FOUND if not following', async () => {
      jest.spyOn(mockRepository, 'relationshipExists').mockResolvedValue(false);

      await expect(service.unfollowUser('follower-1', 'followed-1')).rejects.toMatchObject({
        code: 'NOT_FOUND',
      });
    });

    it('should throw DATABASE_ERROR on a generic repository failure', async () => {
      jest.spyOn(mockRepository, 'relationshipExists').mockResolvedValue(true);
      jest.spyOn(mockRepository, 'deleteFollow').mockRejectedValue(new Error('Neo4j error'));

      await expect(service.unfollowUser('f1', 'f2')).rejects.toMatchObject({
        code: 'DATABASE_ERROR',
      });
    });
  });

  // ─── blockUser ────────────────────────────────────────────────────────────

  describe('blockUser()', () => {
    it('should call repository.createBlock with correct args if not exists', async () => {
      const relationshipExistsSpy = jest.spyOn(mockRepository, 'relationshipExists').mockResolvedValue(false);
      const createBlockSpy = jest.spyOn(mockRepository, 'createBlock').mockResolvedValue(undefined);

      await service.blockUser('blocker-1', 'blocked-1');

      expect(relationshipExistsSpy).toHaveBeenCalledWith('blocker-1', 'blocked-1', 'BLOCK');
      expect(createBlockSpy).toHaveBeenCalledWith('blocker-1', 'blocked-1');
    });

    it('should throw SOCIAL_RELATIONSHIP_ALREADY_EXISTS if already blocked', async () => {
      jest.spyOn(mockRepository, 'relationshipExists').mockResolvedValue(true);

      await expect(service.blockUser('blocker-1', 'blocked-1')).rejects.toMatchObject({
        code: 'CONFLICT',
      });
    });

    it('should throw DATABASE_ERROR on a generic repository failure', async () => {
      jest.spyOn(mockRepository, 'relationshipExists').mockResolvedValue(false);
      jest.spyOn(mockRepository, 'createBlock').mockRejectedValue(new Error('Neo4j error'));

      await expect(service.blockUser('b1', 'b2')).rejects.toMatchObject({
        code: 'DATABASE_ERROR',
      });
    });
  });

  // ─── unblockUser ──────────────────────────────────────────────────────────

  describe('unblockUser()', () => {
    it('should call repository.deleteBlock with correct args if exists', async () => {
      const relationshipExistsSpy = jest.spyOn(mockRepository, 'relationshipExists').mockResolvedValue(true);
      const deleteBlockSpy = jest.spyOn(mockRepository, 'deleteBlock').mockResolvedValue(undefined);

      await service.unblockUser('blocker-1', 'blocked-1');

      expect(relationshipExistsSpy).toHaveBeenCalledWith('blocker-1', 'blocked-1', 'BLOCK');
      expect(deleteBlockSpy).toHaveBeenCalledWith('blocker-1', 'blocked-1');
    });

    it('should throw SOCIAL_RELATIONSHIP_NOT_FOUND if not blocked', async () => {
      jest.spyOn(mockRepository, 'relationshipExists').mockResolvedValue(false);

      await expect(service.unblockUser('blocker-1', 'blocked-1')).rejects.toMatchObject({
        code: 'NOT_FOUND',
      });
    });

    it('should throw DATABASE_ERROR on a generic repository failure', async () => {
      jest.spyOn(mockRepository, 'relationshipExists').mockResolvedValue(true);
      jest.spyOn(mockRepository, 'deleteBlock').mockRejectedValue(new Error('Neo4j error'));

      await expect(service.unblockUser('b1', 'b2')).rejects.toMatchObject({
        code: 'DATABASE_ERROR',
      });
    });
  });

  // ─── getFollows ───────────────────────────────────────────────────────────

  describe('getFollows()', () => {
    it('should return paginated follows from the repository', async () => {
      const expected = PaginatedIdsFactory.buildWithRandomIds(2);
      const getFollowsSpy = jest.spyOn(mockRepository, 'getFollows').mockResolvedValue(expected);

      const result = await service.getFollows('user-1', PAGINATION);

      expect(result).toEqual(expected);
      expect(getFollowsSpy).toHaveBeenCalledWith('user-1', PAGINATION);
    });

    it('should return empty result when no follows exist', async () => {
      jest.spyOn(mockRepository, 'getFollows').mockResolvedValue(PaginatedIdsFactory.buildEmpty());

      const result = await service.getFollows('user-1', PAGINATION);

      expect(result.ids).toHaveLength(0);
    });

    it('should throw DATABASE_ERROR on a generic repository failure', async () => {
      jest.spyOn(mockRepository, 'getFollows').mockRejectedValue(new Error('Query failed'));

      await expect(service.getFollows('user-1', PAGINATION)).rejects.toMatchObject({
        code: 'DATABASE_ERROR',
      });
    });
  });

  // ─── getFollowers ─────────────────────────────────────────────────────────

  describe('getFollowers()', () => {
    it('should return paginated followers from the repository', async () => {
      const expected = PaginatedIdsFactory.buildWithRandomIds(3);
      jest.spyOn(mockRepository, 'getFollowers').mockResolvedValue(expected);

      const result = await service.getFollowers('user-1', PAGINATION);

      expect(result).toEqual(expected);
    });

    it('should throw DATABASE_ERROR on a generic repository failure', async () => {
      jest.spyOn(mockRepository, 'getFollowers').mockRejectedValue(new Error('Query failed'));

      await expect(service.getFollowers('user-1', PAGINATION)).rejects.toMatchObject({
        code: 'DATABASE_ERROR',
      });
    });
  });

  // ─── getBlocks ────────────────────────────────────────────────────────────

  describe('getBlocks()', () => {
    it('should return paginated blocks from the repository', async () => {
      const expected = PaginatedIdsFactory.buildWithRandomIds(1);
      jest.spyOn(mockRepository, 'getBlocks').mockResolvedValue(expected);

      const result = await service.getBlocks('user-1', PAGINATION);

      expect(result).toEqual(expected);
    });

    it('should throw DATABASE_ERROR on a generic repository failure', async () => {
      jest.spyOn(mockRepository, 'getBlocks').mockRejectedValue(new Error('Query failed'));

      await expect(service.getBlocks('user-1', PAGINATION)).rejects.toMatchObject({
        code: 'DATABASE_ERROR',
      });
    });
  });

  // ─── getWhoBlockedMe ──────────────────────────────────────────────────────

  describe('getWhoBlockedMe()', () => {
    it('should return paginated users who blocked me from the repository', async () => {
      const expected = PaginatedIdsFactory.buildWithRandomIds(2);
      jest.spyOn(mockRepository, 'getWhoBlockedMe').mockResolvedValue(expected);

      const result = await service.getWhoBlockedMe('user-1', PAGINATION);

      expect(result).toEqual(expected);
    });

    it('should throw DATABASE_ERROR on a generic repository failure', async () => {
      jest.spyOn(mockRepository, 'getWhoBlockedMe').mockRejectedValue(new Error('Query failed'));

      await expect(service.getWhoBlockedMe('user-1', PAGINATION)).rejects.toMatchObject({
        code: 'DATABASE_ERROR',
      });
    });
  });
});
