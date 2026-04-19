import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { Neo4jSocialUserRepository } from '../../repositories/neo4j-social-user.repository.js';
import { Neo4jParticipationRepository } from '../../repositories/neo4j-participation.repository.js';
import { initTestNeo4j, closeTestNeo4j, getTestProvider, clearGraph } from '../neo4j-driver.js';
import { SocialUserFactory } from '../__test-utils__/factories/social-user.factory.js';
import { SocialEventFactory } from '../__test-utils__/factories/social-event.factory.js';
import { PaginationFactory } from '../__test-utils__/factories/pagination.factory.js';

const USER_A = SocialUserFactory.build({ userId: 'user-a' });
const USER_B = SocialUserFactory.build({ userId: 'user-b' });
const EVENT_1 = SocialEventFactory.build({ eventId: 'event-1' });
const EVENT_2 = SocialEventFactory.build({ eventId: 'event-2' });
const EVENT_NEW = SocialEventFactory.build({ eventId: 'event-new' });
const EVENT_MISSING = SocialEventFactory.build({ eventId: 'event-missing' });
const GHOST_EVENT = SocialEventFactory.build({ eventId: 'ghost-event' });
const PAGINATION = PaginationFactory.build();

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
    await userRepository.createNode(USER_A);
    await userRepository.createNode(USER_B);
    await repository.createEventNode(EVENT_1);
    await repository.createEventNode(EVENT_2);
  });

  // ─── createEventNode / deleteEventNode / eventExists ──────────────────────

  describe('createEventNode()', () => {
    it('should create a SocialEvent node', async () => {
      await repository.createEventNode(EVENT_NEW);

      expect(await repository.eventExists(EVENT_NEW)).toBe(true);
    });

    it('should be idempotent (MERGE)', async () => {
      await repository.createEventNode(EVENT_1);
      await repository.createEventNode(EVENT_1);

      expect(await repository.eventExists(EVENT_1)).toBe(true);
    });
  });

  describe('deleteEventNode()', () => {
    it('should delete the event node and all its relationships', async () => {
      await repository.createParticipation(USER_A, EVENT_1);
      await repository.deleteEventNode(EVENT_1);

      expect(await repository.eventExists(EVENT_1)).toBe(false);
    });

    it('should be a no-op when the node does not exist', async () => {
      await expect(repository.deleteEventNode(GHOST_EVENT)).resolves.toBeUndefined();
    });
  });

  describe('eventExists()', () => {
    it('should return true when the event node exists', async () => {
      expect(await repository.eventExists(EVENT_1)).toBe(true);
    });

    it('should return false when the event node does not exist', async () => {
      expect(await repository.eventExists(EVENT_MISSING)).toBe(false);
    });
  });

  // ─── createUserEvent / deleteUserEvent (CREATED) ──────────────────────────

  describe('createUserEvent() / deleteUserEvent()', () => {
    it('should create a CREATED relationship from a user to an event', async () => {
      await repository.createUserEvent(USER_A, EVENT_1);

      const events = await repository.getUserEvents(USER_A, PAGINATION);
      expect(events.ids).toContain('event-1');
    });

    it('should be idempotent', async () => {
      await repository.createUserEvent(USER_A, EVENT_1);
      await repository.createUserEvent(USER_A, EVENT_1);

      const events = await repository.getUserEvents(USER_A, PAGINATION);
      expect(events.ids).toHaveLength(1);
    });

    it('should delete the CREATED relationship', async () => {
      await repository.createUserEvent(USER_A, EVENT_1);
      await repository.deleteUserEvent(USER_A, EVENT_1);

      const events = await repository.getUserEvents(USER_A, PAGINATION);
      expect(events.ids).not.toContain('event-1');
    });

    it('should be a no-op when deleting a non-existent CREATED relationship', async () => {
      await expect(repository.deleteUserEvent(USER_A, EVENT_1)).resolves.toBeUndefined();
    });
  });

  // ─── createParticipation / deleteParticipation (PARTICIPATE) ─────────────

  describe('createParticipation() / deleteParticipation()', () => {
    it('should create a PARTICIPATE relationship from a user to an event', async () => {
      await repository.createParticipation(USER_A, EVENT_1);

      const participations = await repository.getUserParticipations(USER_A, PAGINATION);
      expect(participations.ids).toContain('event-1');
    });

    it('should be idempotent', async () => {
      await repository.createParticipation(USER_A, EVENT_1);
      await repository.createParticipation(USER_A, EVENT_1);

      const participations = await repository.getUserParticipations(USER_A, PAGINATION);
      expect(participations.ids).toHaveLength(1);
    });

    it('should delete the PARTICIPATE relationship', async () => {
      await repository.createParticipation(USER_A, EVENT_1);
      await repository.deleteParticipation(USER_A, EVENT_1);

      const participations = await repository.getUserParticipations(USER_A, PAGINATION);
      expect(participations.ids).not.toContain('event-1');
    });

    it('should be a no-op when deleting a non-existent participation', async () => {
      await expect(repository.deleteParticipation(USER_A, EVENT_1)).resolves.toBeUndefined();
    });
  });

  // ─── getUserEvents ────────────────────────────────────────────────────────

  describe('getUserEvents()', () => {
    it('should return event ids created by the user', async () => {
      await repository.createUserEvent(USER_A, EVENT_1);
      await repository.createUserEvent(USER_A, EVENT_2);

      const result = await repository.getUserEvents(USER_A, PAGINATION);

      expect(result.ids).toHaveLength(2);
      expect(result.ids).toContain('event-1');
      expect(result.ids).toContain('event-2');
    });

    it('should not mix up CREATED and PARTICIPATE relationships', async () => {
      await repository.createParticipation(USER_A, EVENT_1);

      const created = await repository.getUserEvents(USER_A, PAGINATION);
      expect(created.ids).toHaveLength(0);
    });

    it('should respect pagination', async () => {
      await repository.createUserEvent(USER_A, EVENT_1);
      await repository.createUserEvent(USER_A, EVENT_2);

      const page1 = await repository.getUserEvents(USER_A, PaginationFactory.build(1, 1));
      const page2 = await repository.getUserEvents(USER_A, PaginationFactory.build(2, 1));

      expect(page1.ids).toHaveLength(1);
      expect(page2.ids).toHaveLength(1);
      expect(page1.pagination.total).toBe(2);
    });
  });

  // ─── getUserParticipations ────────────────────────────────────────────────

  describe('getUserParticipations()', () => {
    it('should return event ids the user participates in', async () => {
      await repository.createParticipation(USER_A, EVENT_1);
      await repository.createParticipation(USER_A, EVENT_2);

      const result = await repository.getUserParticipations(USER_A, PAGINATION);

      expect(result.ids).toHaveLength(2);
    });

    it('should return an empty list when the user has no participations', async () => {
      const result = await repository.getUserParticipations(USER_A, PAGINATION);

      expect(result.ids).toHaveLength(0);
    });
  });

  // ─── getEventParticipants ─────────────────────────────────────────────────

  describe('getEventParticipants()', () => {
    it('should return user ids who participate in the event', async () => {
      await repository.createParticipation(USER_A, EVENT_1);
      await repository.createParticipation(USER_B, EVENT_1);

      const result = await repository.getEventParticipants(EVENT_1, PAGINATION);

      expect(result.ids).toHaveLength(2);
      expect(result.ids).toContain('user-a');
      expect(result.ids).toContain('user-b');
    });

    it('should not include creators in participant list', async () => {
      await repository.createUserEvent(USER_A, EVENT_1);

      const result = await repository.getEventParticipants(EVENT_1, PAGINATION);

      expect(result.ids).toHaveLength(0);
    });

    it('should return an empty list when the event has no participants', async () => {
      const result = await repository.getEventParticipants(EVENT_1, PAGINATION);

      expect(result.ids).toHaveLength(0);
    });

    it('should respect pagination', async () => {
      await repository.createParticipation(USER_A, EVENT_1);
      await repository.createParticipation(USER_B, EVENT_1);

      const page1 = await repository.getEventParticipants(EVENT_1, PaginationFactory.build(1, 1));

      expect(page1.ids).toHaveLength(1);
      expect(page1.pagination.total).toBe(2);
      expect(page1.pagination.totalPages).toBe(2);
    });
  });
});
