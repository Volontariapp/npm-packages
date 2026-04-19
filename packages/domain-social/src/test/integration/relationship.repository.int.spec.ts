import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { Neo4jSocialUserRepository } from '../../repositories/neo4j-social-user.repository.js';
import { Neo4jRelationshipRepository } from '../../repositories/neo4j-relationship.repository.js';
import { initTestNeo4j, closeTestNeo4j, getTestProvider, clearGraph } from '../neo4j-driver.js';
import { SocialUserFactory } from '../__test-utils__/factories/social-user.factory.js';
import { PaginationFactory } from '../__test-utils__/factories/pagination.factory.js';

const USER_A = SocialUserFactory.build({ userId: 'user-a' });
const USER_B = SocialUserFactory.build({ userId: 'user-b' });
const USER_C = SocialUserFactory.build({ userId: 'user-c' });
const PAGINATION = PaginationFactory.build();

describe('Neo4jRelationshipRepository (Integration)', () => {
  let userRepository: Neo4jSocialUserRepository;
  let repository: Neo4jRelationshipRepository;

  beforeAll(async () => {
    await initTestNeo4j();
    const provider = getTestProvider();
    userRepository = new Neo4jSocialUserRepository(provider);
    repository = new Neo4jRelationshipRepository(provider);
  });

  afterAll(async () => {
    await closeTestNeo4j();
  });

  beforeEach(async () => {
    await clearGraph();
    await userRepository.createNode(USER_A);
    await userRepository.createNode(USER_B);
    await userRepository.createNode(USER_C);
  });

  // ─── FOLLOW ───────────────────────────────────────────────────────────────

  describe('createFollow() / deleteFollow()', () => {
    it('should create a FOLLOW relationship between two users', async () => {
      await repository.createFollow(USER_A, USER_B);

      const follows = await repository.getFollows(USER_A, PAGINATION);
      expect(follows.ids).toContain('user-b');
    });

    it('should be idempotent — duplicate FOLLOW does not duplicate the relationship', async () => {
      await repository.createFollow(USER_A, USER_B);
      await repository.createFollow(USER_A, USER_B);

      const follows = await repository.getFollows(USER_A, PAGINATION);
      expect(follows.ids).toHaveLength(1);
    });

    it('should delete the FOLLOW relationship', async () => {
      await repository.createFollow(USER_A, USER_B);
      await repository.deleteFollow(USER_A, USER_B);

      const follows = await repository.getFollows(USER_A, PAGINATION);
      expect(follows.ids).not.toContain('user-b');
    });

    it('should be a no-op when deleting a non-existent FOLLOW', async () => {
      await expect(repository.deleteFollow(USER_A, USER_B)).resolves.toBeUndefined();
    });
  });

  // ─── BLOCK ────────────────────────────────────────────────────────────────

  describe('createBlock() / deleteBlock()', () => {
    it('should create a BLOCK relationship between two users', async () => {
      await repository.createBlock(USER_A, USER_B);

      const blocks = await repository.getBlocks(USER_A, PAGINATION);
      expect(blocks.ids).toContain('user-b');
    });

    it('should be idempotent — duplicate BLOCK does not duplicate the relationship', async () => {
      await repository.createBlock(USER_A, USER_B);
      await repository.createBlock(USER_A, USER_B);

      const blocks = await repository.getBlocks(USER_A, PAGINATION);
      expect(blocks.ids).toHaveLength(1);
    });

    it('should delete the BLOCK relationship', async () => {
      await repository.createBlock(USER_A, USER_B);
      await repository.deleteBlock(USER_A, USER_B);

      const blocks = await repository.getBlocks(USER_A, PAGINATION);
      expect(blocks.ids).not.toContain('user-b');
    });
  });

  // ─── getFollows ───────────────────────────────────────────────────────────

  describe('getFollows()', () => {
    it('should return ids of users followed by the given user', async () => {
      await repository.createFollow(USER_A, USER_B);
      await repository.createFollow(USER_A, USER_C);

      const result = await repository.getFollows(USER_A, PAGINATION);

      expect(result.ids).toHaveLength(2);
      expect(result.ids).toContain('user-b');
      expect(result.ids).toContain('user-c');
    });

    it('should return an empty list when the user follows nobody', async () => {
      const result = await repository.getFollows(USER_A, PAGINATION);

      expect(result.ids).toHaveLength(0);
      expect(result.pagination.total).toBe(0);
    });

    it('should respect pagination — limit and total are correct', async () => {
      await repository.createFollow(USER_A, USER_B);
      await repository.createFollow(USER_A, USER_C);

      const page1 = await repository.getFollows(USER_A, PaginationFactory.build(1, 1));
      const page2 = await repository.getFollows(USER_A, PaginationFactory.build(2, 1));

      expect(page1.ids).toHaveLength(1);
      expect(page2.ids).toHaveLength(1);
      expect(page1.pagination.total).toBe(2);
      expect(page1.pagination.totalPages).toBe(2);
      expect(page1.ids[0]).not.toBe(page2.ids[0]);
    });
  });

  // ─── getFollowers ─────────────────────────────────────────────────────────

  describe('getFollowers()', () => {
    it('should return ids of users who follow the given user', async () => {
      await repository.createFollow(USER_B, USER_A);
      await repository.createFollow(USER_C, USER_A);

      const result = await repository.getFollowers(USER_A, PAGINATION);

      expect(result.ids).toHaveLength(2);
      expect(result.ids).toContain('user-b');
      expect(result.ids).toContain('user-c');
    });

    it('should return an empty list when the user has no followers', async () => {
      const result = await repository.getFollowers(USER_A, PAGINATION);

      expect(result.ids).toHaveLength(0);
    });
  });

  // ─── getBlocks ────────────────────────────────────────────────────────────

  describe('getBlocks()', () => {
    it('should return ids of users blocked by the given user', async () => {
      await repository.createBlock(USER_A, USER_B);

      const result = await repository.getBlocks(USER_A, PAGINATION);

      expect(result.ids).toContain('user-b');
      expect(result.pagination.total).toBe(1);
    });

    it('should return an empty list when the user has no blocks', async () => {
      const result = await repository.getBlocks(USER_A, PAGINATION);

      expect(result.ids).toHaveLength(0);
    });
  });

  // ─── getWhoBlockedMe ──────────────────────────────────────────────────────

  describe('getWhoBlockedMe()', () => {
    it('should return ids of users who blocked the given user', async () => {
      await repository.createBlock(USER_B, USER_A);
      await repository.createBlock(USER_C, USER_A);

      const result = await repository.getWhoBlockedMe(USER_A, PAGINATION);

      expect(result.ids).toHaveLength(2);
      expect(result.ids).toContain('user-b');
      expect(result.ids).toContain('user-c');
    });

    it('should return an empty list when nobody has blocked the given user', async () => {
      const result = await repository.getWhoBlockedMe(USER_A, PAGINATION);

      expect(result.ids).toHaveLength(0);
    });
  });
});
