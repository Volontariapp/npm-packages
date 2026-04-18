import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { Neo4jSocialUserRepository } from '../../repositories/neo4j-social-user.repository.js';
import { Neo4jRelationshipRepository } from '../../repositories/neo4j-relationship.repository.js';
import { initTestNeo4j, closeTestNeo4j, getTestProvider, clearGraph } from '../neo4j-driver.js';

const PAGINATION = { page: 1, limit: 10 };

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
    await userRepository.createNode('user-a');
    await userRepository.createNode('user-b');
    await userRepository.createNode('user-c');
  });

  // ─── FOLLOW ───────────────────────────────────────────────────────────────

  describe('createFollow() / deleteFollow()', () => {
    it('should create a FOLLOW relationship between two users', async () => {
      await repository.createFollow('user-a', 'user-b');

      const follows = await repository.getFollows('user-a', PAGINATION);
      expect(follows.ids).toContain('user-b');
    });

    it('should be idempotent — duplicate FOLLOW does not duplicate the relationship', async () => {
      await repository.createFollow('user-a', 'user-b');
      await repository.createFollow('user-a', 'user-b');

      const follows = await repository.getFollows('user-a', PAGINATION);
      expect(follows.ids).toHaveLength(1);
    });

    it('should delete the FOLLOW relationship', async () => {
      await repository.createFollow('user-a', 'user-b');
      await repository.deleteFollow('user-a', 'user-b');

      const follows = await repository.getFollows('user-a', PAGINATION);
      expect(follows.ids).not.toContain('user-b');
    });

    it('should be a no-op when deleting a non-existent FOLLOW', async () => {
      await expect(repository.deleteFollow('user-a', 'user-b')).resolves.toBeUndefined();
    });
  });

  // ─── BLOCK ────────────────────────────────────────────────────────────────

  describe('createBlock() / deleteBlock()', () => {
    it('should create a BLOCK relationship between two users', async () => {
      await repository.createBlock('user-a', 'user-b');

      const blocks = await repository.getBlocks('user-a', PAGINATION);
      expect(blocks.ids).toContain('user-b');
    });

    it('should be idempotent — duplicate BLOCK does not duplicate the relationship', async () => {
      await repository.createBlock('user-a', 'user-b');
      await repository.createBlock('user-a', 'user-b');

      const blocks = await repository.getBlocks('user-a', PAGINATION);
      expect(blocks.ids).toHaveLength(1);
    });

    it('should delete the BLOCK relationship', async () => {
      await repository.createBlock('user-a', 'user-b');
      await repository.deleteBlock('user-a', 'user-b');

      const blocks = await repository.getBlocks('user-a', PAGINATION);
      expect(blocks.ids).not.toContain('user-b');
    });
  });

  // ─── getFollows ───────────────────────────────────────────────────────────

  describe('getFollows()', () => {
    it('should return ids of users followed by the given user', async () => {
      await repository.createFollow('user-a', 'user-b');
      await repository.createFollow('user-a', 'user-c');

      const result = await repository.getFollows('user-a', PAGINATION);

      expect(result.ids).toHaveLength(2);
      expect(result.ids).toContain('user-b');
      expect(result.ids).toContain('user-c');
    });

    it('should return an empty list when the user follows nobody', async () => {
      const result = await repository.getFollows('user-a', PAGINATION);

      expect(result.ids).toHaveLength(0);
      expect(result.pagination.total).toBe(0);
    });

    it('should respect pagination — limit and total are correct', async () => {
      await repository.createFollow('user-a', 'user-b');
      await repository.createFollow('user-a', 'user-c');

      const page1 = await repository.getFollows('user-a', { page: 1, limit: 1 });
      const page2 = await repository.getFollows('user-a', { page: 2, limit: 1 });

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
      await repository.createFollow('user-b', 'user-a');
      await repository.createFollow('user-c', 'user-a');

      const result = await repository.getFollowers('user-a', PAGINATION);

      expect(result.ids).toHaveLength(2);
      expect(result.ids).toContain('user-b');
      expect(result.ids).toContain('user-c');
    });

    it('should return an empty list when the user has no followers', async () => {
      const result = await repository.getFollowers('user-a', PAGINATION);

      expect(result.ids).toHaveLength(0);
    });
  });

  // ─── getBlocks ────────────────────────────────────────────────────────────

  describe('getBlocks()', () => {
    it('should return ids of users blocked by the given user', async () => {
      await repository.createBlock('user-a', 'user-b');

      const result = await repository.getBlocks('user-a', PAGINATION);

      expect(result.ids).toContain('user-b');
      expect(result.pagination.total).toBe(1);
    });

    it('should return an empty list when the user has no blocks', async () => {
      const result = await repository.getBlocks('user-a', PAGINATION);

      expect(result.ids).toHaveLength(0);
    });
  });

  // ─── getWhoBlockedMe ──────────────────────────────────────────────────────

  describe('getWhoBlockedMe()', () => {
    it('should return ids of users who blocked the given user', async () => {
      await repository.createBlock('user-b', 'user-a');
      await repository.createBlock('user-c', 'user-a');

      const result = await repository.getWhoBlockedMe('user-a', PAGINATION);

      expect(result.ids).toHaveLength(2);
      expect(result.ids).toContain('user-b');
      expect(result.ids).toContain('user-c');
    });

    it('should return an empty list when nobody has blocked the given user', async () => {
      const result = await repository.getWhoBlockedMe('user-a', PAGINATION);

      expect(result.ids).toHaveLength(0);
    });
  });
});
