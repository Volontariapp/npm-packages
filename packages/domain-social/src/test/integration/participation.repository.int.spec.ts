import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { Neo4jSocialUserRepository } from '../../repositories/neo4j-social-user.repository.js';
import { Neo4jParticipationRepository } from '../../repositories/neo4j-participation.repository.js';
import { initTestNeo4j, closeTestNeo4j, getTestProvider, clearGraph } from '../neo4j-driver.js';

const PAGINATION = { page: 1, limit: 10 };

describe('Neo4jParticipationRepository (Integration)', () => {
  let userRepository: Neo4jSocialUserRepository;
  let repository: Neo4jParticipationRepository;

  beforeAll(async () => {
    await initTestNeo4j();
    const provider = getTestProvider();
    userRepository = new Neo4jSocialUserRepository(provider);
    repository = new Neo4jParticipationRepository(provider);
  });

  afterAll(async () => {
    await closeTestNeo4j();
  });

  beforeEach(async () => {
    await clearGraph();
    await userRepository.createNode('user-a');
    await userRepository.createNode('user-b');
    await repository.createEventNode('event-1');
    await repository.createEventNode('event-2');
  });

  // ─── createEventNode / deleteEventNode / eventExists ──────────────────────

  describe('createEventNode()', () => {
    it('should create a SocialEvent node', async () => {
      await repository.createEventNode('event-new');

      expect(await repository.eventExists('event-new')).toBe(true);
    });

    it('should be idempotent (MERGE)', async () => {
      await repository.createEventNode('event-1');
      await repository.createEventNode('event-1');

      expect(await repository.eventExists('event-1')).toBe(true);
    });
  });

  describe('deleteEventNode()', () => {
    it('should delete the event node and all its relationships', async () => {
      await repository.createParticipation('user-a', 'event-1');
      await repository.deleteEventNode('event-1');

      expect(await repository.eventExists('event-1')).toBe(false);
    });

    it('should be a no-op when the node does not exist', async () => {
      await expect(repository.deleteEventNode('ghost-event')).resolves.toBeUndefined();
    });
  });

  describe('eventExists()', () => {
    it('should return true when the event node exists', async () => {
      expect(await repository.eventExists('event-1')).toBe(true);
    });

    it('should return false when the event node does not exist', async () => {
      expect(await repository.eventExists('event-missing')).toBe(false);
    });
  });

  // ─── createUserEvent / deleteUserEvent (CREATED) ──────────────────────────

  describe('createUserEvent() / deleteUserEvent()', () => {
    it('should create a CREATED relationship from a user to an event', async () => {
      await repository.createUserEvent('user-a', 'event-1');

      const events = await repository.getUserEvents('user-a', PAGINATION);
      expect(events.ids).toContain('event-1');
    });

    it('should be idempotent', async () => {
      await repository.createUserEvent('user-a', 'event-1');
      await repository.createUserEvent('user-a', 'event-1');

      const events = await repository.getUserEvents('user-a', PAGINATION);
      expect(events.ids).toHaveLength(1);
    });

    it('should delete the CREATED relationship', async () => {
      await repository.createUserEvent('user-a', 'event-1');
      await repository.deleteUserEvent('user-a', 'event-1');

      const events = await repository.getUserEvents('user-a', PAGINATION);
      expect(events.ids).not.toContain('event-1');
    });

    it('should be a no-op when deleting a non-existent CREATED relationship', async () => {
      await expect(repository.deleteUserEvent('user-a', 'event-1')).resolves.toBeUndefined();
    });
  });

  // ─── createParticipation / deleteParticipation (PARTICIPATE) ─────────────

  describe('createParticipation() / deleteParticipation()', () => {
    it('should create a PARTICIPATE relationship from a user to an event', async () => {
      await repository.createParticipation('user-a', 'event-1');

      const participations = await repository.getUserParticipations('user-a', PAGINATION);
      expect(participations.ids).toContain('event-1');
    });

    it('should be idempotent', async () => {
      await repository.createParticipation('user-a', 'event-1');
      await repository.createParticipation('user-a', 'event-1');

      const participations = await repository.getUserParticipations('user-a', PAGINATION);
      expect(participations.ids).toHaveLength(1);
    });

    it('should delete the PARTICIPATE relationship', async () => {
      await repository.createParticipation('user-a', 'event-1');
      await repository.deleteParticipation('user-a', 'event-1');

      const participations = await repository.getUserParticipations('user-a', PAGINATION);
      expect(participations.ids).not.toContain('event-1');
    });

    it('should be a no-op when deleting a non-existent participation', async () => {
      await expect(repository.deleteParticipation('user-a', 'event-1')).resolves.toBeUndefined();
    });
  });

  // ─── getUserEvents ────────────────────────────────────────────────────────

  describe('getUserEvents()', () => {
    it('should return event ids created by the user', async () => {
      await repository.createUserEvent('user-a', 'event-1');
      await repository.createUserEvent('user-a', 'event-2');

      const result = await repository.getUserEvents('user-a', PAGINATION);

      expect(result.ids).toHaveLength(2);
      expect(result.ids).toContain('event-1');
      expect(result.ids).toContain('event-2');
    });

    it('should not mix up CREATED and PARTICIPATE relationships', async () => {
      await repository.createParticipation('user-a', 'event-1');

      const created = await repository.getUserEvents('user-a', PAGINATION);
      expect(created.ids).toHaveLength(0);
    });

    it('should respect pagination', async () => {
      await repository.createUserEvent('user-a', 'event-1');
      await repository.createUserEvent('user-a', 'event-2');

      const page1 = await repository.getUserEvents('user-a', { page: 1, limit: 1 });
      const page2 = await repository.getUserEvents('user-a', { page: 2, limit: 1 });

      expect(page1.ids).toHaveLength(1);
      expect(page2.ids).toHaveLength(1);
      expect(page1.pagination.total).toBe(2);
    });
  });

  // ─── getUserParticipations ────────────────────────────────────────────────

  describe('getUserParticipations()', () => {
    it('should return event ids the user participates in', async () => {
      await repository.createParticipation('user-a', 'event-1');
      await repository.createParticipation('user-a', 'event-2');

      const result = await repository.getUserParticipations('user-a', PAGINATION);

      expect(result.ids).toHaveLength(2);
    });

    it('should return an empty list when the user has no participations', async () => {
      const result = await repository.getUserParticipations('user-a', PAGINATION);

      expect(result.ids).toHaveLength(0);
    });
  });

  // ─── getEventParticipants ─────────────────────────────────────────────────

  describe('getEventParticipants()', () => {
    it('should return user ids who participate in the event', async () => {
      await repository.createParticipation('user-a', 'event-1');
      await repository.createParticipation('user-b', 'event-1');

      const result = await repository.getEventParticipants('event-1', PAGINATION);

      expect(result.ids).toHaveLength(2);
      expect(result.ids).toContain('user-a');
      expect(result.ids).toContain('user-b');
    });

    it('should not include creators in participant list', async () => {
      await repository.createUserEvent('user-a', 'event-1');

      const result = await repository.getEventParticipants('event-1', PAGINATION);

      expect(result.ids).toHaveLength(0);
    });

    it('should return an empty list when the event has no participants', async () => {
      const result = await repository.getEventParticipants('event-1', PAGINATION);

      expect(result.ids).toHaveLength(0);
    });

    it('should respect pagination', async () => {
      await repository.createParticipation('user-a', 'event-1');
      await repository.createParticipation('user-b', 'event-1');

      const page1 = await repository.getEventParticipants('event-1', { page: 1, limit: 1 });

      expect(page1.ids).toHaveLength(1);
      expect(page1.pagination.total).toBe(2);
      expect(page1.pagination.totalPages).toBe(2);
    });
  });
});
