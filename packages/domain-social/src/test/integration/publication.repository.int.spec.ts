import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { Neo4jSocialUserRepository } from '../../repositories/neo4j-social-user.repository.js';
import { Neo4jPublicationRepository } from '../../repositories/neo4j-publication.repository.js';
import { Neo4jRelationshipRepository } from '../../repositories/neo4j-relationship.repository.js';
import { initTestNeo4j, closeTestNeo4j, getTestProvider, clearGraph } from '../neo4j-driver.js';
import { SocialUserFactory } from '../__test-utils__/factories/social-user.factory.js';
import { SocialPostFactory } from '../__test-utils__/factories/social-post.factory.js';
import { PaginationFactory } from '../__test-utils__/factories/pagination.factory.js';

const USER_A = SocialUserFactory.build({ userId: 'user-a' });
const USER_B = SocialUserFactory.build({ userId: 'user-b' });
const USER_C = SocialUserFactory.build({ userId: 'user-c' });
const POST_1 = SocialPostFactory.build({ postId: 'post-1' });
const POST_2 = SocialPostFactory.build({ postId: 'post-2' });
const POST_3 = SocialPostFactory.build({ postId: 'post-3' });
const POST_B = SocialPostFactory.build({ postId: 'post-b' });
const POST_B1 = SocialPostFactory.build({ postId: 'post-b1' });
const POST_B2 = SocialPostFactory.build({ postId: 'post-b2' });
const POST_C1 = SocialPostFactory.build({ postId: 'post-c1' });
const POST_OWN = SocialPostFactory.build({ postId: 'post-own' });
const POST_EXISTS = SocialPostFactory.build({ postId: 'post-exists' });
const POST_MISSING = SocialPostFactory.build({ postId: 'post-missing' });
const GHOST_POST = SocialPostFactory.build({ postId: 'ghost-post' });
const PAGINATION = PaginationFactory.build();

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
    await userRepository.createNode(USER_A);
    await userRepository.createNode(USER_B);
  });

  // ─── createPostNode / deletePostNode / postExists ─────────────────────────

  describe('createPostNode()', () => {
    it('should create a SocialPost node', async () => {
      await repository.createPostNode(POST_1);

      expect(await repository.postExists(POST_1)).toBe(true);
    });

    it('should be idempotent (MERGE)', async () => {
      await repository.createPostNode(POST_1);
      await repository.createPostNode(POST_1);

      expect(await repository.postExists(POST_1)).toBe(true);
    });
  });

  describe('deletePostNode()', () => {
    it('should delete the post node', async () => {
      await repository.createPostNode(POST_1);
      await repository.deletePostNode(POST_1);

      expect(await repository.postExists(POST_1)).toBe(false);
    });

    it('should be a no-op when the node does not exist', async () => {
      await expect(repository.deletePostNode(GHOST_POST)).resolves.toBeUndefined();
    });
  });

  describe('postExists()', () => {
    it('should return true when the post node exists', async () => {
      await repository.createPostNode(POST_EXISTS);

      expect(await repository.postExists(POST_EXISTS)).toBe(true);
    });

    it('should return false when the post node does not exist', async () => {
      expect(await repository.postExists(POST_MISSING)).toBe(false);
    });
  });

  // ─── createOwnership / deleteOwnership ────────────────────────────────────

  describe('createOwnership()', () => {
    it('should create an OWN relationship between a user and a post', async () => {
      await repository.createPostNode(POST_1);
      await repository.createOwnership(USER_A, POST_1);

      const posts = await repository.getUserPosts(USER_A, PAGINATION);
      expect(posts.ids).toContain('post-1');
    });

    it('should be idempotent — duplicate OWN does not duplicate the relationship', async () => {
      await repository.createPostNode(POST_1);
      await repository.createOwnership(USER_A, POST_1);
      await repository.createOwnership(USER_A, POST_1);

      const posts = await repository.getUserPosts(USER_A, PAGINATION);
      expect(posts.ids).toHaveLength(1);
    });
  });

  describe('deleteOwnership()', () => {
    it('should remove the OWN relationship', async () => {
      await repository.createPostNode(POST_1);
      await repository.createOwnership(USER_A, POST_1);
      await repository.deleteOwnership(USER_A, POST_1);

      const posts = await repository.getUserPosts(USER_A, PAGINATION);
      expect(posts.ids).not.toContain('post-1');
    });

    it('should be a no-op when the relationship does not exist', async () => {
      await expect(repository.deleteOwnership(USER_A, GHOST_POST)).resolves.toBeUndefined();
    });
  });

  // ─── getUserPosts ─────────────────────────────────────────────────────────

  describe('getUserPosts()', () => {
    it('should return posts owned by the user', async () => {
      await repository.createPostNode(POST_1);
      await repository.createPostNode(POST_2);
      await repository.createOwnership(USER_A, POST_1);
      await repository.createOwnership(USER_A, POST_2);

      const result = await repository.getUserPosts(USER_A, PAGINATION);

      expect(result.ids).toHaveLength(2);
      expect(result.ids).toContain('post-1');
      expect(result.ids).toContain('post-2');
      expect(result.pagination.total).toBe(2);
    });

    it('should not return posts owned by other users', async () => {
      await repository.createPostNode(POST_B);
      await repository.createOwnership(USER_B, POST_B);

      const result = await repository.getUserPosts(USER_A, PAGINATION);

      expect(result.ids).toHaveLength(0);
    });

    it('should respect pagination', async () => {
      await repository.createPostNode(POST_1);
      await repository.createPostNode(POST_2);
      await repository.createPostNode(POST_3);
      await repository.createOwnership(USER_A, POST_1);
      await repository.createOwnership(USER_A, POST_2);
      await repository.createOwnership(USER_A, POST_3);

      const page1 = await repository.getUserPosts(USER_A, PaginationFactory.build(1, 2));
      const page2 = await repository.getUserPosts(USER_A, PaginationFactory.build(2, 2));

      expect(page1.ids).toHaveLength(2);
      expect(page2.ids).toHaveLength(1);
      expect(page1.pagination.total).toBe(3);
      expect(page1.pagination.totalPages).toBe(2);
    });
  });

  // ─── getFeed ──────────────────────────────────────────────────────────────

  describe('getFeed()', () => {
    it('should return posts from users that the given user follows', async () => {
      await repository.createPostNode(POST_B1);
      await repository.createPostNode(POST_B2);
      await repository.createOwnership(USER_B, POST_B1);
      await repository.createOwnership(USER_B, POST_B2);
      await relationshipRepository.createFollow(USER_A, USER_B);

      const feed = await repository.getFeed(USER_A, PAGINATION);

      expect(feed.ids).toHaveLength(2);
      expect(feed.ids).toContain('post-b1');
      expect(feed.ids).toContain('post-b2');
    });

    it('should return an empty feed when the user follows nobody', async () => {
      const feed = await repository.getFeed(USER_A, PAGINATION);

      expect(feed.ids).toHaveLength(0);
    });

    it('should not include the user own posts in feed', async () => {
      await repository.createPostNode(POST_OWN);
      await repository.createOwnership(USER_A, POST_OWN);

      const feed = await repository.getFeed(USER_A, PAGINATION);

      expect(feed.ids).not.toContain('post-own');
    });

    it('should deduplicate posts visible via multiple follow paths', async () => {
      await userRepository.createNode(USER_C);
      await repository.createPostNode(POST_1);
      await repository.createOwnership(USER_B, POST_1);
      await relationshipRepository.createFollow(USER_A, USER_B);

      const feed = await repository.getFeed(USER_A, PAGINATION);

      const postCount = feed.ids.filter((id) => id === 'post-1').length;
      expect(postCount).toBe(1);
    });

    it('should respect pagination on the feed', async () => {
      await userRepository.createNode(USER_C);
      await repository.createPostNode(POST_B1);
      await repository.createPostNode(POST_B2);
      await repository.createPostNode(POST_C1);
      await repository.createOwnership(USER_B, POST_B1);
      await repository.createOwnership(USER_B, POST_B2);
      await repository.createOwnership(USER_C, POST_C1);
      await relationshipRepository.createFollow(USER_A, USER_B);
      await relationshipRepository.createFollow(USER_A, USER_C);

      const page1 = await repository.getFeed(USER_A, PaginationFactory.build(1, 2));
      const page2 = await repository.getFeed(USER_A, PaginationFactory.build(2, 2));

      expect(page1.ids).toHaveLength(2);
      expect(page2.ids).toHaveLength(1);
      expect(page1.pagination.total).toBe(3);
    });
  });
});
