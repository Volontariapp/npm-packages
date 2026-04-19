import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { Neo4jSocialUserRepository } from '../../repositories/neo4j-social-user.repository.js';
import { Neo4jPublicationRepository } from '../../repositories/neo4j-publication.repository.js';
import { Neo4jInteractionRepository } from '../../repositories/neo4j-interaction.repository.js';
import { initTestNeo4j, closeTestNeo4j, getTestProvider, clearGraph } from '../neo4j-driver.js';
import { SocialUserFactory } from '../__test-utils__/factories/social-user.factory.js';
import { SocialPostFactory } from '../__test-utils__/factories/social-post.factory.js';
import { PaginationFactory } from '../__test-utils__/factories/pagination.factory.js';

const USER_A = SocialUserFactory.build({ userId: 'user-a' });
const USER_B = SocialUserFactory.build({ userId: 'user-b' });
const POST_1 = SocialPostFactory.build({ postId: 'post-1' });
const POST_2 = SocialPostFactory.build({ postId: 'post-2' });
const PAGINATION = PaginationFactory.build();

describe('Neo4jInteractionRepository (Integration)', () => {
  let userRepository: Neo4jSocialUserRepository;
  let publicationRepository: Neo4jPublicationRepository;
  let repository: Neo4jInteractionRepository;

  beforeAll(async () => {
    await initTestNeo4j();
    const provider = getTestProvider();
    userRepository = new Neo4jSocialUserRepository(provider);
    publicationRepository = new Neo4jPublicationRepository(provider);
    repository = new Neo4jInteractionRepository(provider);
  });

  afterAll(async () => {
    await closeTestNeo4j();
  });

  beforeEach(async () => {
    await clearGraph();
    await userRepository.createNode(USER_A);
    await userRepository.createNode(USER_B);
    await publicationRepository.createPostNode(POST_1);
    await publicationRepository.createPostNode(POST_2);
  });

  // ─── createLike / deleteLike ──────────────────────────────────────────────

  describe('createLike()', () => {
    it('should create a LIKE relationship from a user to a post', async () => {
      await repository.createLike(USER_A, POST_1);

      const likes = await repository.getUserLikes(USER_A, PAGINATION);
      expect(likes.ids).toContain('post-1');
    });

    it('should be idempotent — duplicate LIKE does not create multiple relationships', async () => {
      await repository.createLike(USER_A, POST_1);
      await repository.createLike(USER_A, POST_1);

      const likes = await repository.getUserLikes(USER_A, PAGINATION);
      expect(likes.ids).toHaveLength(1);
    });

    it('should allow different users to like the same post independently', async () => {
      await repository.createLike(USER_A, POST_1);
      await repository.createLike(USER_B, POST_1);

      const likers = await repository.getPostLikers(POST_1, PAGINATION);
      expect(likers.ids).toHaveLength(2);
    });
  });

  describe('deleteLike()', () => {
    it('should remove the LIKE relationship', async () => {
      await repository.createLike(USER_A, POST_1);
      await repository.deleteLike(USER_A, POST_1);

      const likes = await repository.getUserLikes(USER_A, PAGINATION);
      expect(likes.ids).not.toContain('post-1');
    });

    it('should only remove the targeted like — other likes remain', async () => {
      await repository.createLike(USER_A, POST_1);
      await repository.createLike(USER_A, POST_2);
      await repository.deleteLike(USER_A, POST_1);

      const likes = await repository.getUserLikes(USER_A, PAGINATION);
      expect(likes.ids).toHaveLength(1);
      expect(likes.ids).toContain('post-2');
    });

    it('should be a no-op when the relationship does not exist', async () => {
      await expect(repository.deleteLike(USER_A, POST_1)).resolves.toBeUndefined();
    });
  });

  // ─── getUserLikes ─────────────────────────────────────────────────────────

  describe('getUserLikes()', () => {
    it('should return post ids liked by the user', async () => {
      await repository.createLike(USER_A, POST_1);
      await repository.createLike(USER_A, POST_2);

      const result = await repository.getUserLikes(USER_A, PAGINATION);

      expect(result.ids).toHaveLength(2);
      expect(result.ids).toContain('post-1');
      expect(result.ids).toContain('post-2');
      expect(result.pagination.total).toBe(2);
    });

    it('should return an empty list when the user has no likes', async () => {
      const result = await repository.getUserLikes(USER_A, PAGINATION);

      expect(result.ids).toHaveLength(0);
    });

    it('should respect pagination', async () => {
      await repository.createLike(USER_A, POST_1);
      await repository.createLike(USER_A, POST_2);

      const page1 = await repository.getUserLikes(USER_A, PaginationFactory.build(1, 1));
      const page2 = await repository.getUserLikes(USER_A, PaginationFactory.build(2, 1));

      expect(page1.ids).toHaveLength(1);
      expect(page2.ids).toHaveLength(1);
      expect(page1.pagination.total).toBe(2);
      expect(page1.ids[0]).not.toBe(page2.ids[0]);
    });
  });

  // ─── getPostLikers ────────────────────────────────────────────────────────

  describe('getPostLikers()', () => {
    it('should return user ids who liked the post', async () => {
      await repository.createLike(USER_A, POST_1);
      await repository.createLike(USER_B, POST_1);

      const result = await repository.getPostLikers(POST_1, PAGINATION);

      expect(result.ids).toHaveLength(2);
      expect(result.ids).toContain('user-a');
      expect(result.ids).toContain('user-b');
    });

    it('should return an empty list when the post has no likers', async () => {
      const result = await repository.getPostLikers(POST_1, PAGINATION);

      expect(result.ids).toHaveLength(0);
    });

    it('should respect pagination', async () => {
      await repository.createLike(USER_A, POST_1);
      await repository.createLike(USER_B, POST_1);

      const page1 = await repository.getPostLikers(POST_1, PaginationFactory.build(1, 1));

      expect(page1.ids).toHaveLength(1);
      expect(page1.pagination.total).toBe(2);
      expect(page1.pagination.totalPages).toBe(2);
    });
  });
});
