import { describe, it, expect, afterEach, jest } from '@jest/globals';
import neo4j from 'neo4j-driver';
import type { PaginationVO } from '../../value-objects/pagination.vo.js';
import type { PaginatedIdsVO } from '../../value-objects/paginated-ids.vo.js';
import { Neo4jInteractionRepository } from '../../repositories/neo4j-interaction.repository.js';
import { Neo4jRelationshipRepository } from '../../repositories/neo4j-relationship.repository.js';
import { Neo4jPublicationRepository } from '../../repositories/neo4j-publication.repository.js';
import { Neo4jParticipationRepository } from '../../repositories/neo4j-participation.repository.js';
import { Neo4jEventPostLinkRepository } from '../../repositories/neo4j-event-post-link.repository.js';
import { PaginationFactory } from '../__test-utils__/factories/pagination.factory.js';
import { SocialUserFactory } from '../__test-utils__/factories/social-user.factory.js';
import { SocialPostFactory } from '../__test-utils__/factories/social-post.factory.js';
import { SocialEventFactory } from '../__test-utils__/factories/social-event.factory.js';
import { createNeo4jProviderMock } from '../__test-utils__/mocks/neo4j-provider.mock.js';
import type { Neo4jProviderMock } from '../__test-utils__/mocks/neo4j-provider.mock.js';

const PAGINATION = PaginationFactory.build(3, 20);
const user = SocialUserFactory.build({ userId: 'u1' });
const post = SocialPostFactory.build({ postId: 'p1' });
const event = SocialEventFactory.build({ eventId: 'e1' });

interface PaginatedCase {
  name: string;
  call: (mock: Neo4jProviderMock, pagination: PaginationVO) => Promise<PaginatedIdsVO>;
}

const cases: PaginatedCase[] = [
  {
    name: 'interaction.getUserLikes',
    call: (m, p) => new Neo4jInteractionRepository(m.provider).getUserLikes(user, p),
  },
  {
    name: 'interaction.getPostLikers',
    call: (m, p) => new Neo4jInteractionRepository(m.provider).getPostLikers(post, p),
  },
  {
    name: 'relationship.getFollows',
    call: (m, p) => new Neo4jRelationshipRepository(m.provider).getFollows(user, p),
  },
  {
    name: 'relationship.getFollowers',
    call: (m, p) => new Neo4jRelationshipRepository(m.provider).getFollowers(user, p),
  },
  {
    name: 'relationship.getBlocks',
    call: (m, p) => new Neo4jRelationshipRepository(m.provider).getBlocks(user, p),
  },
  {
    name: 'relationship.getWhoBlockedMe',
    call: (m, p) => new Neo4jRelationshipRepository(m.provider).getWhoBlockedMe(user, p),
  },
  {
    name: 'publication.getUserPosts',
    call: (m, p) => new Neo4jPublicationRepository(m.provider).getUserPosts(user, p),
  },
  {
    name: 'publication.getFeed',
    call: (m, p) => new Neo4jPublicationRepository(m.provider).getFeed(user, p),
  },
  {
    name: 'participation.getUserEvents',
    call: (m, p) => new Neo4jParticipationRepository(m.provider).getUserEvents(user, p),
  },
  {
    name: 'participation.getUserParticipations',
    call: (m, p) => new Neo4jParticipationRepository(m.provider).getUserParticipations(user, p),
  },
  {
    name: 'participation.getUserWishes',
    call: (m, p) => new Neo4jParticipationRepository(m.provider).getUserWishes(user, p),
  },
  {
    name: 'participation.getEventParticipants',
    call: (m, p) => new Neo4jParticipationRepository(m.provider).getEventParticipants(event, p),
  },
  {
    name: 'participation.getRecommendedEventIds',
    call: (m, p) =>
      new Neo4jParticipationRepository(m.provider).getRecommendedEventIds('u1', {}, p),
  },
  {
    name: 'event-post-link.getEventPosts',
    call: (m, p) => new Neo4jEventPostLinkRepository(m.provider).getEventPosts(event, p),
  },
];

describe('Neo4j: ORDER BY deterministe sur toutes les requetes paginees', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it.each(cases)('$name ordonne avant SKIP/LIMIT et garde des entiers neo4j', async ({ call }) => {
    const mock = createNeo4jProviderMock();

    await call(mock, PAGINATION);

    const dataCall = mock.run.mock.calls.find(([cypher]) => cypher.includes('SKIP'));
    expect(dataCall).toBeDefined();
    const [cypher, params] = dataCall ?? ['', {}];
    const orderIndex = cypher.indexOf('ORDER BY');
    expect(orderIndex).toBeGreaterThan(-1);
    expect(orderIndex).toBeLessThan(cypher.indexOf('SKIP'));
    expect(neo4j.isInt(params.skip)).toBe(true);
    expect(neo4j.isInt(params.limit)).toBe(true);
    expect(neo4j.int(params.skip as number).toNumber()).toBe(40);
    expect(neo4j.int(params.limit as number).toNumber()).toBe(20);
  });

  it('les listes de participations trient par registeredAt DESC puis id', async () => {
    const mock = createNeo4jProviderMock();
    const repo = new Neo4jParticipationRepository(mock.provider);

    await repo.getUserParticipations(user, PAGINATION);
    await repo.getEventParticipants(event, PAGINATION);

    const dataQueries = mock.run.mock.calls.map(([c]) => c).filter((c) => c.includes('SKIP'));
    expect(dataQueries).toHaveLength(2);
    for (const cypher of dataQueries) {
      expect(cypher).toMatch(/ORDER BY coalesce\(r\.registeredAt, .*\) DESC, id ASC/);
    }
  });

  it('les autres listes (sans horodatage stocke) trient sur l identifiant seul', async () => {
    const mock = createNeo4jProviderMock();

    await new Neo4jInteractionRepository(mock.provider).getUserLikes(user, PAGINATION);

    const cypher = mock.run.mock.calls.map(([c]) => c).find((c) => c.includes('SKIP')) ?? '';
    expect(cypher).toContain('ORDER BY id');
    expect(cypher).not.toContain('createdAt');
  });
});
