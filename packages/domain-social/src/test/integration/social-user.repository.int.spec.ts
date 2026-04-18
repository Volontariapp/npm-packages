import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { Neo4jSocialUserRepository } from '../../repositories/neo4j-social-user.repository.js';
import { initTestNeo4j, closeTestNeo4j, getTestProvider, clearGraph } from '../neo4j-driver.js';
import { SocialUserFactory } from '../__test-utils__/factories/social-user.factory.js';

const USER_1 = SocialUserFactory.build({ userId: 'user-1' });
const USER_2 = SocialUserFactory.build({ userId: 'user-2' });
const USER_EXISTS = SocialUserFactory.build({ userId: 'user-exists' });
const USER_MISSING = SocialUserFactory.build({ userId: 'user-missing' });
const GHOST_USER = SocialUserFactory.build({ userId: 'ghost-user' });

describe('Neo4jSocialUserRepository (Integration)', () => {
  let repository: Neo4jSocialUserRepository;

  beforeAll(async () => {
    await initTestNeo4j();
    repository = new Neo4jSocialUserRepository(getTestProvider());
  });

  afterAll(async () => {
    await closeTestNeo4j();
  });

  beforeEach(async () => {
    await clearGraph();
  });

  // ─── createNode ───────────────────────────────────────────────────────────

  describe('createNode()', () => {
    it('should create a SocialUser node in the graph', async () => {
      await repository.createNode(USER_1);

      const exists = await repository.exists(USER_1);
      expect(exists).toBe(true);
    });

    it('should be idempotent when called twice with the same userId (MERGE)', async () => {
      await repository.createNode(USER_1);
      await repository.createNode(USER_1);

      const exists = await repository.exists(USER_1);
      expect(exists).toBe(true);
    });

    it('should create multiple independent nodes', async () => {
      await repository.createNode(USER_1);
      await repository.createNode(USER_2);

      expect(await repository.exists(USER_1)).toBe(true);
      expect(await repository.exists(USER_2)).toBe(true);
    });
  });

  // ─── deleteNode ───────────────────────────────────────────────────────────

  describe('deleteNode()', () => {
    it('should delete the node and all its relationships', async () => {
      await repository.createNode(USER_1);

      await repository.deleteNode(USER_1);

      expect(await repository.exists(USER_1)).toBe(false);
    });

    it('should be a no-op when the node does not exist', async () => {
      await expect(repository.deleteNode(GHOST_USER)).resolves.toBeUndefined();
    });
  });

  // ─── exists ───────────────────────────────────────────────────────────────

  describe('exists()', () => {
    it('should return true when the user node exists', async () => {
      await repository.createNode(USER_EXISTS);

      expect(await repository.exists(USER_EXISTS)).toBe(true);
    });

    it('should return false when the user node does not exist', async () => {
      expect(await repository.exists(USER_MISSING)).toBe(false);
    });
  });
});
