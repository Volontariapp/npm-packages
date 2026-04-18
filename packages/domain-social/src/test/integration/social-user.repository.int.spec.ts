import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { Neo4jSocialUserRepository } from '../../repositories/neo4j-social-user.repository.js';
import { initTestNeo4j, closeTestNeo4j, getTestProvider, clearGraph } from '../neo4j-driver.js';

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
      await repository.createNode('user-1');

      const exists = await repository.exists('user-1');
      expect(exists).toBe(true);
    });

    it('should be idempotent when called twice with the same userId (MERGE)', async () => {
      await repository.createNode('user-1');
      await repository.createNode('user-1');

      const exists = await repository.exists('user-1');
      expect(exists).toBe(true);
    });

    it('should create multiple independent nodes', async () => {
      await repository.createNode('user-1');
      await repository.createNode('user-2');

      expect(await repository.exists('user-1')).toBe(true);
      expect(await repository.exists('user-2')).toBe(true);
    });
  });

  // ─── deleteNode ───────────────────────────────────────────────────────────

  describe('deleteNode()', () => {
    it('should delete the node and all its relationships', async () => {
      await repository.createNode('user-1');

      await repository.deleteNode('user-1');

      expect(await repository.exists('user-1')).toBe(false);
    });

    it('should be a no-op when the node does not exist', async () => {
      await expect(repository.deleteNode('ghost-user')).resolves.toBeUndefined();
    });
  });

  // ─── exists ───────────────────────────────────────────────────────────────

  describe('exists()', () => {
    it('should return true when the user node exists', async () => {
      await repository.createNode('user-exists');

      expect(await repository.exists('user-exists')).toBe(true);
    });

    it('should return false when the user node does not exist', async () => {
      expect(await repository.exists('user-missing')).toBe(false);
    });
  });
});
