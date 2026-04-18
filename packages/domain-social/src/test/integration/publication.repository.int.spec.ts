import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { Neo4jSocialUserRepository } from '../../repositories/neo4j-social-user.repository.js';
import { Neo4jPublicationRepository } from '../../repositories/neo4j-publication.repository.js';
import { Neo4jRelationshipRepository } from '../../repositories/neo4j-relationship.repository.js';
import { initTestNeo4j, closeTestNeo4j, getTestProvider, clearGraph } from '../neo4j-driver.js';

const PAGINATION = { page: 1, limit: 10 };

describe('Neo4jPublicationRepository (Integration)', () => {
  let userRepository: Neo4jSocialUserRepository;
  let relationshipRepository: Neo4jRelationshipRepository;
  let repository: Neo4jPublicationRepository;

  beforeAll(async () => {
    await initTestNeo4j();
    const provider = getTestProvider();
    userRepository = new Neo4jSocialUserRepository(provider);
    relationshipRepository = new Neo4jRelationshipRepository(provider);
    repository = new Neo4jPublicationRepository(provider);
  });

  afterAll(async () => {
    await closeTestNeo4j();
  });

  beforeEach(async () => {
    await clearGraph();
    await userRepository.createNode('user-a');
    await userRepository.createNode('user-b');
  });

  // ─── createPostNode / deletePostNode / postExists ─────────────────────────

  describe('createPostNode()', () => {
    it('should create a SocialPost node', async () => {
      await repository.createPostNode('post-1');

      expect(await repository.postExists('post-1')).toBe(true);
    });

    it('should be idempotent (MERGE)', async () => {
      await repository.createPostNode('post-1');
      await repository.createPostNode('post-1');

      expect(await repository.postExists('post-1')).toBe(true);
    });
  });

  describe('deletePostNode()', () => {
    it('should delete the post node', async () => {
      await repository.createPostNode('post-1');
      await repository.deletePostNode('post-1');

      expect(await repository.postExists('post-1')).toBe(false);
    });

    it('should be a no-op when the node does not exist', async () => {
      await expect(repository.deletePostNode('ghost-post')).resolves.toBeUndefined();
    });
  });

  describe('postExists()', () => {
    it('should return true when the post node exists', async () => {
      await repository.createPostNode('post-exists');

      expect(await repository.postExists('post-exists')).toBe(true);
    });

    it('should return false when the post node does not exist', async () => {
      expect(await repository.postExists('post-missing')).toBe(false);
    });
  });

  // ─── createOwnership / deleteOwnership ────────────────────────────────────

  describe('createOwnership()', () => {
    it('should create an OWN relationship between a user and a post', async () => {
      await repository.createPostNode('post-1');
      await repository.createOwnership('user-a', 'post-1');

      const posts = await repository.getUserPosts('user-a', PAGINATION);
      expect(posts.ids).toContain('post-1');
    });

    it('should be idempotent — duplicate OWN does not duplicate the relationship', async () => {
      await repository.createPostNode('post-1');
      await repository.createOwnership('user-a', 'post-1');
      await repository.createOwnership('user-a', 'post-1');

      const posts = await repository.getUserPosts('user-a', PAGINATION);
      expect(posts.ids).toHaveLength(1);
    });
  });

  describe('deleteOwnership()', () => {
    it('should remove the OWN relationship', async () => {
      await repository.createPostNode('post-1');
      await repository.createOwnership('user-a', 'post-1');
      await repository.deleteOwnership('user-a', 'post-1');

      const posts = await repository.getUserPosts('user-a', PAGINATION);
      expect(posts.ids).not.toContain('post-1');
    });

    it('should be a no-op when the relationship does not exist', async () => {
      await expect(repository.deleteOwnership('user-a', 'ghost-post')).resolves.toBeUndefined();
    });
  });

  // ─── getUserPosts ─────────────────────────────────────────────────────────

  describe('getUserPosts()', () => {
    it('should return posts owned by the user', async () => {
      await repository.createPostNode('post-1');
      await repository.createPostNode('post-2');
      await repository.createOwnership('user-a', 'post-1');
      await repository.createOwnership('user-a', 'post-2');

      const result = await repository.getUserPosts('user-a', PAGINATION);

      expect(result.ids).toHaveLength(2);
      expect(result.ids).toContain('post-1');
      expect(result.ids).toContain('post-2');
      expect(result.pagination.total).toBe(2);
    });

    it('should not return posts owned by other users', async () => {
      await repository.createPostNode('post-b');
      await repository.createOwnership('user-b', 'post-b');

      const result = await repository.getUserPosts('user-a', PAGINATION);

      expect(result.ids).toHaveLength(0);
    });

    it('should respect pagination', async () => {
      await repository.createPostNode('post-1');
      await repository.createPostNode('post-2');
      await repository.createPostNode('post-3');
      await repository.createOwnership('user-a', 'post-1');
      await repository.createOwnership('user-a', 'post-2');
      await repository.createOwnership('user-a', 'post-3');

      const page1 = await repository.getUserPosts('user-a', { page: 1, limit: 2 });
      const page2 = await repository.getUserPosts('user-a', { page: 2, limit: 2 });

      expect(page1.ids).toHaveLength(2);
      expect(page2.ids).toHaveLength(1);
      expect(page1.pagination.total).toBe(3);
      expect(page1.pagination.totalPages).toBe(2);
    });
  });

  // ─── getFeed ──────────────────────────────────────────────────────────────

  describe('getFeed()', () => {
    it('should return posts from users that the given user follows', async () => {
      await repository.createPostNode('post-b1');
      await repository.createPostNode('post-b2');
      await repository.createOwnership('user-b', 'post-b1');
      await repository.createOwnership('user-b', 'post-b2');
      await relationshipRepository.createFollow('user-a', 'user-b');

      const feed = await repository.getFeed('user-a', PAGINATION);

      expect(feed.ids).toHaveLength(2);
      expect(feed.ids).toContain('post-b1');
      expect(feed.ids).toContain('post-b2');
    });

    it('should return an empty feed when the user follows nobody', async () => {
      const feed = await repository.getFeed('user-a', PAGINATION);

      expect(feed.ids).toHaveLength(0);
    });

    it('should not include the user own posts in feed', async () => {
      await repository.createPostNode('post-own');
      await repository.createOwnership('user-a', 'post-own');

      const feed = await repository.getFeed('user-a', PAGINATION);

      expect(feed.ids).not.toContain('post-own');
    });

    it('should deduplicate posts visible via multiple follow paths', async () => {
      // user-a follows user-b, user-b owns post-1
      await userRepository.createNode('user-c');
      await repository.createPostNode('post-1');
      await repository.createOwnership('user-b', 'post-1');
      await relationshipRepository.createFollow('user-a', 'user-b');

      const feed = await repository.getFeed('user-a', PAGINATION);

      const postCount = feed.ids.filter((id) => id === 'post-1').length;
      expect(postCount).toBe(1);
    });

    it('should respect pagination on the feed', async () => {
      await userRepository.createNode('user-c');
      await repository.createPostNode('post-b1');
      await repository.createPostNode('post-b2');
      await repository.createPostNode('post-c1');
      await repository.createOwnership('user-b', 'post-b1');
      await repository.createOwnership('user-b', 'post-b2');
      await repository.createOwnership('user-c', 'post-c1');
      await relationshipRepository.createFollow('user-a', 'user-b');
      await relationshipRepository.createFollow('user-a', 'user-c');

      const page1 = await repository.getFeed('user-a', { page: 1, limit: 2 });
      const page2 = await repository.getFeed('user-a', { page: 2, limit: 2 });

      expect(page1.ids).toHaveLength(2);
      expect(page2.ids).toHaveLength(1);
      expect(page1.pagination.total).toBe(3);
    });
  });
});
