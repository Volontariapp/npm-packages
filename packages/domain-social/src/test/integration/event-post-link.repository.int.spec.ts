import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { Neo4jSocialUserRepository } from '../../repositories/neo4j-social-user.repository.js';
import { Neo4jPublicationRepository } from '../../repositories/neo4j-publication.repository.js';
import { Neo4jParticipationRepository } from '../../repositories/neo4j-participation.repository.js';
import { Neo4jEventPostLinkRepository } from '../../repositories/neo4j-event-post-link.repository.js';
import { initTestNeo4j, closeTestNeo4j, getTestProvider, clearGraph } from '../neo4j-driver.js';

const PAGINATION = { page: 1, limit: 10 };

describe('Neo4jEventPostLinkRepository (Integration)', () => {
  let userRepository: Neo4jSocialUserRepository;
  let publicationRepository: Neo4jPublicationRepository;
  let participationRepository: Neo4jParticipationRepository;
  let repository: Neo4jEventPostLinkRepository;

  beforeAll(async () => {
    await initTestNeo4j();
    const provider = getTestProvider();
    userRepository = new Neo4jSocialUserRepository(provider);
    publicationRepository = new Neo4jPublicationRepository(provider);
    participationRepository = new Neo4jParticipationRepository(provider);
    repository = new Neo4jEventPostLinkRepository(provider);
  });

  afterAll(async () => {
    await closeTestNeo4j();
  });

  beforeEach(async () => {
    await clearGraph();
    await userRepository.createNode('user-a');
    await publicationRepository.createPostNode('post-1');
    await publicationRepository.createPostNode('post-2');
    await publicationRepository.createPostNode('post-3');
    await participationRepository.createEventNode('event-1');
    await participationRepository.createEventNode('event-2');
  });

  // ─── linkPostToEvent / unlinkPostFromEvent ────────────────────────────────

  describe('linkPostToEvent()', () => {
    it('should create a LINK_TO_EVENT relationship from a post to an event', async () => {
      await repository.linkPostToEvent('post-1', 'event-1');

      const eventId = await repository.getEventRelatedToPost('post-1');
      expect(eventId).toBe('event-1');
    });

    it('should be idempotent (MERGE)', async () => {
      await repository.linkPostToEvent('post-1', 'event-1');
      await repository.linkPostToEvent('post-1', 'event-1');

      const eventId = await repository.getEventRelatedToPost('post-1');
      expect(eventId).toBe('event-1');
    });

    it('should allow multiple posts to be linked to the same event', async () => {
      await repository.linkPostToEvent('post-1', 'event-1');
      await repository.linkPostToEvent('post-2', 'event-1');

      const posts = await repository.getEventPosts('event-1', PAGINATION);
      expect(posts.ids).toHaveLength(2);
      expect(posts.ids).toContain('post-1');
      expect(posts.ids).toContain('post-2');
    });
  });

  describe('unlinkPostFromEvent()', () => {
    it('should remove the LINK_TO_EVENT relationship', async () => {
      await repository.linkPostToEvent('post-1', 'event-1');
      await repository.unlinkPostFromEvent('post-1', 'event-1');

      const eventId = await repository.getEventRelatedToPost('post-1');
      expect(eventId).toBeNull();
    });

    it('should only remove the targeted link — other links remain', async () => {
      await repository.linkPostToEvent('post-1', 'event-1');
      await repository.linkPostToEvent('post-2', 'event-1');
      await repository.unlinkPostFromEvent('post-1', 'event-1');

      const posts = await repository.getEventPosts('event-1', PAGINATION);
      expect(posts.ids).toHaveLength(1);
      expect(posts.ids).toContain('post-2');
    });

    it('should be a no-op when the relationship does not exist', async () => {
      await expect(repository.unlinkPostFromEvent('post-1', 'event-1')).resolves.toBeUndefined();
    });
  });

  // ─── getEventRelatedToPost ────────────────────────────────────────────────

  describe('getEventRelatedToPost()', () => {
    it('should return the event id linked to the post', async () => {
      await repository.linkPostToEvent('post-1', 'event-1');

      const result = await repository.getEventRelatedToPost('post-1');

      expect(result).toBe('event-1');
    });

    it('should return null when the post is not linked to any event', async () => {
      const result = await repository.getEventRelatedToPost('post-1');

      expect(result).toBeNull();
    });

    it('should return null for a non-existent post', async () => {
      const result = await repository.getEventRelatedToPost('ghost-post');

      expect(result).toBeNull();
    });
  });

  // ─── getEventPosts ────────────────────────────────────────────────────────

  describe('getEventPosts()', () => {
    it('should return post ids linked to the event', async () => {
      await repository.linkPostToEvent('post-1', 'event-1');
      await repository.linkPostToEvent('post-2', 'event-1');

      const result = await repository.getEventPosts('event-1', PAGINATION);

      expect(result.ids).toHaveLength(2);
      expect(result.ids).toContain('post-1');
      expect(result.ids).toContain('post-2');
      expect(result.pagination.total).toBe(2);
    });

    it('should return an empty list when the event has no linked posts', async () => {
      const result = await repository.getEventPosts('event-1', PAGINATION);

      expect(result.ids).toHaveLength(0);
    });

    it('should not include posts linked to other events', async () => {
      await repository.linkPostToEvent('post-1', 'event-1');
      await repository.linkPostToEvent('post-2', 'event-2');

      const result = await repository.getEventPosts('event-1', PAGINATION);

      expect(result.ids).toHaveLength(1);
      expect(result.ids).toContain('post-1');
      expect(result.ids).not.toContain('post-2');
    });

    it('should respect pagination', async () => {
      await repository.linkPostToEvent('post-1', 'event-1');
      await repository.linkPostToEvent('post-2', 'event-1');
      await repository.linkPostToEvent('post-3', 'event-1');

      const page1 = await repository.getEventPosts('event-1', { page: 1, limit: 2 });
      const page2 = await repository.getEventPosts('event-1', { page: 2, limit: 2 });

      expect(page1.ids).toHaveLength(2);
      expect(page2.ids).toHaveLength(1);
      expect(page1.pagination.total).toBe(3);
      expect(page1.pagination.totalPages).toBe(2);
    });
  });
});
