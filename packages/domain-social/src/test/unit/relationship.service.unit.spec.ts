import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { RelationshipService } from '../../services/relationship.service.js';
import type { IRelationshipRepository } from '../../repositories/interfaces/relationship.repository.js';
import { createRelationshipRepositoryMock } from '../__test-utils__/mocks/relationship.repository.mock.js';
import { PaginatedIdsFactory } from '../__test-utils__/factories/paginated-ids.factory.js';
import { UserIdFactory } from '../__test-utils__/factories/ids.factory.js';
import { PaginationFactory } from '../__test-utils__/factories/pagination.factory.js';
import { SocialUserFactory } from '../__test-utils__/factories/social-user.factory.js';

const PAGINATION = PaginationFactory.build();

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
    it('should call repository.createFollow with correct entities if not exists', async () => {
      const followerEntity = SocialUserFactory.build({ userId: 'follower-1' });
      const followedEntity = SocialUserFactory.build({ userId: 'followed-1' });
      const relationshipExistsSpy = jest
        .spyOn(mockRepository, 'relationshipExists')
        .mockResolvedValue(false);
      const createFollowSpy = jest
        .spyOn(mockRepository, 'createFollow')
        .mockResolvedValue(undefined);

      await service.followUser(
        UserIdFactory.build('follower-1'),
        UserIdFactory.build('followed-1'),
      );

      expect(relationshipExistsSpy).toHaveBeenCalledWith(followerEntity, followedEntity, 'FOLLOW');
      expect(createFollowSpy).toHaveBeenCalledWith(followerEntity, followedEntity);
    });

    it('should throw SOCIAL_RELATIONSHIP_ALREADY_EXISTS if already following', async () => {
      jest.spyOn(mockRepository, 'relationshipExists').mockResolvedValue(true);

      await expect(
        service.followUser(UserIdFactory.build('follower-1'), UserIdFactory.build('followed-1')),
      ).rejects.toMatchObject({ code: 'CONFLICT' });
    });

    it('should throw DATABASE_ERROR on a generic repository failure', async () => {
      jest.spyOn(mockRepository, 'relationshipExists').mockResolvedValue(false);
      jest.spyOn(mockRepository, 'createFollow').mockRejectedValue(new Error('Neo4j error'));

      await expect(
        service.followUser(UserIdFactory.build('f1'), UserIdFactory.build('f2')),
      ).rejects.toMatchObject({ code: 'DATABASE_ERROR' });
    });

    it('should rethrow a BaseError without wrapping', async () => {
      jest.spyOn(mockRepository, 'relationshipExists').mockResolvedValue(false);
      jest.spyOn(mockRepository, 'createFollow').mockRejectedValue({
        code: 'DATABASE_QUERY_ERROR',
        isBaseError: true,
      });

      await expect(
        service.followUser(UserIdFactory.build('f1'), UserIdFactory.build('f2')),
      ).rejects.toMatchObject({ isBaseError: true });
    });
  });

  // ─── unfollowUser ─────────────────────────────────────────────────────────

  describe('unfollowUser()', () => {
    it('should call repository.deleteFollow with correct entities if exists', async () => {
      const followerEntity = SocialUserFactory.build({ userId: 'follower-1' });
      const followedEntity = SocialUserFactory.build({ userId: 'followed-1' });
      const relationshipExistsSpy = jest
        .spyOn(mockRepository, 'relationshipExists')
        .mockResolvedValue(true);
      const deleteFollowSpy = jest
        .spyOn(mockRepository, 'deleteFollow')
        .mockResolvedValue(undefined);

      await service.unfollowUser(
        UserIdFactory.build('follower-1'),
        UserIdFactory.build('followed-1'),
      );

      expect(relationshipExistsSpy).toHaveBeenCalledWith(followerEntity, followedEntity, 'FOLLOW');
      expect(deleteFollowSpy).toHaveBeenCalledWith(followerEntity, followedEntity);
    });

    it('should throw SOCIAL_RELATIONSHIP_NOT_FOUND if not following', async () => {
      jest.spyOn(mockRepository, 'relationshipExists').mockResolvedValue(false);

      await expect(
        service.unfollowUser(UserIdFactory.build('follower-1'), UserIdFactory.build('followed-1')),
      ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    });

    it('should throw DATABASE_ERROR on a generic repository failure', async () => {
      jest.spyOn(mockRepository, 'relationshipExists').mockResolvedValue(true);
      jest.spyOn(mockRepository, 'deleteFollow').mockRejectedValue(new Error('Neo4j error'));

      await expect(
        service.unfollowUser(UserIdFactory.build('f1'), UserIdFactory.build('f2')),
      ).rejects.toMatchObject({ code: 'DATABASE_ERROR' });
    });
  });

  // ─── blockUser ────────────────────────────────────────────────────────────

  describe('blockUser()', () => {
    it('should call repository.createBlock with correct entities if not exists', async () => {
      const blockerEntity = SocialUserFactory.build({ userId: 'blocker-1' });
      const blockedEntity = SocialUserFactory.build({ userId: 'blocked-1' });
      const relationshipExistsSpy = jest
        .spyOn(mockRepository, 'relationshipExists')
        .mockResolvedValue(false);
      const createBlockSpy = jest.spyOn(mockRepository, 'createBlock').mockResolvedValue(undefined);

      await service.blockUser(UserIdFactory.build('blocker-1'), UserIdFactory.build('blocked-1'));

      expect(relationshipExistsSpy).toHaveBeenCalledWith(blockerEntity, blockedEntity, 'BLOCK');
      expect(createBlockSpy).toHaveBeenCalledWith(blockerEntity, blockedEntity);
    });

    it('should throw SOCIAL_RELATIONSHIP_ALREADY_EXISTS if already blocked', async () => {
      jest.spyOn(mockRepository, 'relationshipExists').mockResolvedValue(true);

      await expect(
        service.blockUser(UserIdFactory.build('blocker-1'), UserIdFactory.build('blocked-1')),
      ).rejects.toMatchObject({ code: 'CONFLICT' });
    });

    it('should throw DATABASE_ERROR on a generic repository failure', async () => {
      jest.spyOn(mockRepository, 'relationshipExists').mockResolvedValue(false);
      jest.spyOn(mockRepository, 'createBlock').mockRejectedValue(new Error('Neo4j error'));

      await expect(
        service.blockUser(UserIdFactory.build('b1'), UserIdFactory.build('b2')),
      ).rejects.toMatchObject({ code: 'DATABASE_ERROR' });
    });
  });

  // ─── unblockUser ──────────────────────────────────────────────────────────

  describe('unblockUser()', () => {
    it('should call repository.deleteBlock with correct entities if exists', async () => {
      const blockerEntity = SocialUserFactory.build({ userId: 'blocker-1' });
      const blockedEntity = SocialUserFactory.build({ userId: 'blocked-1' });
      const relationshipExistsSpy = jest
        .spyOn(mockRepository, 'relationshipExists')
        .mockResolvedValue(true);
      const deleteBlockSpy = jest.spyOn(mockRepository, 'deleteBlock').mockResolvedValue(undefined);

      await service.unblockUser(UserIdFactory.build('blocker-1'), UserIdFactory.build('blocked-1'));

      expect(relationshipExistsSpy).toHaveBeenCalledWith(blockerEntity, blockedEntity, 'BLOCK');
      expect(deleteBlockSpy).toHaveBeenCalledWith(blockerEntity, blockedEntity);
    });

    it('should throw SOCIAL_RELATIONSHIP_NOT_FOUND if not blocked', async () => {
      jest.spyOn(mockRepository, 'relationshipExists').mockResolvedValue(false);

      await expect(
        service.unblockUser(UserIdFactory.build('blocker-1'), UserIdFactory.build('blocked-1')),
      ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    });

    it('should throw DATABASE_ERROR on a generic repository failure', async () => {
      jest.spyOn(mockRepository, 'relationshipExists').mockResolvedValue(true);
      jest.spyOn(mockRepository, 'deleteBlock').mockRejectedValue(new Error('Neo4j error'));

      await expect(
        service.unblockUser(UserIdFactory.build('b1'), UserIdFactory.build('b2')),
      ).rejects.toMatchObject({ code: 'DATABASE_ERROR' });
    });
  });

  // ─── getFollows ───────────────────────────────────────────────────────────

  describe('getFollows()', () => {
    it('should return paginated follows from the repository', async () => {
      const userEntity = SocialUserFactory.build({ userId: 'user-1' });
      const expected = PaginatedIdsFactory.buildWithRandomIds(2);
      const getFollowsSpy = jest.spyOn(mockRepository, 'getFollows').mockResolvedValue(expected);

      const result = await service.getFollows(UserIdFactory.build('user-1'), PAGINATION);

      expect(result).toEqual(expected);
      expect(getFollowsSpy).toHaveBeenCalledWith(userEntity, PAGINATION);
    });

    it('should return empty result when no follows exist', async () => {
      jest.spyOn(mockRepository, 'getFollows').mockResolvedValue(PaginatedIdsFactory.buildEmpty());

      const result = await service.getFollows(UserIdFactory.build('user-1'), PAGINATION);

      expect(result.ids).toHaveLength(0);
    });

    it('should throw DATABASE_ERROR on a generic repository failure', async () => {
      jest.spyOn(mockRepository, 'getFollows').mockRejectedValue(new Error('Query failed'));

      await expect(
        service.getFollows(UserIdFactory.build('user-1'), PAGINATION),
      ).rejects.toMatchObject({ code: 'DATABASE_ERROR' });
    });
  });

  // ─── getFollowers ─────────────────────────────────────────────────────────

  describe('getFollowers()', () => {
    it('should return paginated followers from the repository', async () => {
      const expected = PaginatedIdsFactory.buildWithRandomIds(3);
      jest.spyOn(mockRepository, 'getFollowers').mockResolvedValue(expected);

      const result = await service.getFollowers(UserIdFactory.build('user-1'), PAGINATION);

      expect(result).toEqual(expected);
    });

    it('should throw DATABASE_ERROR on a generic repository failure', async () => {
      jest.spyOn(mockRepository, 'getFollowers').mockRejectedValue(new Error('Query failed'));

      await expect(
        service.getFollowers(UserIdFactory.build('user-1'), PAGINATION),
      ).rejects.toMatchObject({ code: 'DATABASE_ERROR' });
    });
  });

  // ─── getBlocks ────────────────────────────────────────────────────────────

  describe('getBlocks()', () => {
    it('should return paginated blocks from the repository', async () => {
      const expected = PaginatedIdsFactory.buildWithRandomIds(1);
      jest.spyOn(mockRepository, 'getBlocks').mockResolvedValue(expected);

      const result = await service.getBlocks(UserIdFactory.build('user-1'), PAGINATION);

      expect(result).toEqual(expected);
    });

    it('should throw DATABASE_ERROR on a generic repository failure', async () => {
      jest.spyOn(mockRepository, 'getBlocks').mockRejectedValue(new Error('Query failed'));

      await expect(
        service.getBlocks(UserIdFactory.build('user-1'), PAGINATION),
      ).rejects.toMatchObject({ code: 'DATABASE_ERROR' });
    });
  });

  // ─── getWhoBlockedMe ──────────────────────────────────────────────────────

  describe('getWhoBlockedMe()', () => {
    it('should return paginated users who blocked me from the repository', async () => {
      const expected = PaginatedIdsFactory.buildWithRandomIds(2);
      jest.spyOn(mockRepository, 'getWhoBlockedMe').mockResolvedValue(expected);

      const result = await service.getWhoBlockedMe(UserIdFactory.build('user-1'), PAGINATION);

      expect(result).toEqual(expected);
    });

    it('should throw DATABASE_ERROR on a generic repository failure', async () => {
      jest.spyOn(mockRepository, 'getWhoBlockedMe').mockRejectedValue(new Error('Query failed'));

      await expect(
        service.getWhoBlockedMe(UserIdFactory.build('user-1'), PAGINATION),
      ).rejects.toMatchObject({ code: 'DATABASE_ERROR' });
    });
  });
});
