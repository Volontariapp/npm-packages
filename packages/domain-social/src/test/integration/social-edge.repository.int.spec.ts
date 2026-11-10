import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { SocialEdgeKind } from '@volontariapp/messaging';
import { Neo4jSocialUserRepository } from '../../repositories/neo4j-social-user.repository.js';
import { Neo4jPublicationRepository } from '../../repositories/neo4j-publication.repository.js';
import { Neo4jParticipationRepository } from '../../repositories/neo4j-participation.repository.js';
import { Neo4jInteractionRepository } from '../../repositories/neo4j-interaction.repository.js';
import { Neo4jRelationshipRepository } from '../../repositories/neo4j-relationship.repository.js';
import { Neo4jSocialEdgeRepository } from '../../repositories/neo4j-social-edge.repository.js';
import { initTestNeo4j, closeTestNeo4j, getTestProvider, clearGraph } from '../neo4j-driver.js';
import { SocialUserFactory } from '../__test-utils__/factories/social-user.factory.js';
import { SocialPostFactory } from '../__test-utils__/factories/social-post.factory.js';
import { SocialEventFactory } from '../__test-utils__/factories/social-event.factory.js';
import { PaginationFactory } from '../__test-utils__/factories/pagination.factory.js';

const USER_A = SocialUserFactory.build({ userId: 'user-a' });
const USER_B = SocialUserFactory.build({ userId: 'user-b' });
const POST_1 = SocialPostFactory.build({ postId: 'post-1' });
const EVENT_1 = SocialEventFactory.build({ eventId: 'event-1' });
const PAGINATION = PaginationFactory.build();

describe('Neo4jSocialEdgeRepository (Integration)', () => {
  let users: Neo4jSocialUserRepository;
  let publications: Neo4jPublicationRepository;
  let participations: Neo4jParticipationRepository;
  let interactions: Neo4jInteractionRepository;
  let relationships: Neo4jRelationshipRepository;
  let repository: Neo4jSocialEdgeRepository;

  beforeAll(async () => {
    await initTestNeo4j();
    const provider = getTestProvider();
    users = new Neo4jSocialUserRepository(provider);
    publications = new Neo4jPublicationRepository(provider);
    participations = new Neo4jParticipationRepository(provider);
    interactions = new Neo4jInteractionRepository(provider);
    relationships = new Neo4jRelationshipRepository(provider);
    repository = new Neo4jSocialEdgeRepository(provider);
  });

  afterAll(async () => {
    await closeTestNeo4j();
  });

  beforeEach(async () => {
    await clearGraph();
    await users.createNode(USER_A);
    await users.createNode(USER_B);
    await publications.createPostNode(POST_1);
    await participations.createEventNode(EVENT_1);
  });

  it('should create a like, and applying it twice leaves a single relationship', async () => {
    const state = [{ kind: SocialEdgeKind.LIKE, present: true }];

    const first = await repository.converge('user-a', 'post-1', state);
    const second = await repository.converge('user-a', 'post-1', state);

    expect(first[0].affected).toBe(1);
    expect(second[0].affected).toBe(1);
    const likers = await interactions.getPostLikers(POST_1, PAGINATION);
    expect(likers.ids).toEqual(['user-a']);
  });

  it('should delete a like, and deleting twice is a no-op', async () => {
    await interactions.createLike(USER_A, POST_1);
    const state = [{ kind: SocialEdgeKind.LIKE, present: false }];

    const first = await repository.converge('user-a', 'post-1', state);
    const second = await repository.converge('user-a', 'post-1', state);

    expect(first[0].affected).toBe(1);
    expect(second[0].affected).toBe(0);
    expect((await interactions.getPostLikers(POST_1, PAGINATION)).ids).toEqual([]);
  });

  it('should report 0 when the post node does not exist yet', async () => {
    const [result] = await repository.converge('user-a', 'post-missing', [
      { kind: SocialEdgeKind.LIKE, present: true },
    ]);

    expect(result.affected).toBe(0);
  });

  it('should report 0 when the user node does not exist yet', async () => {
    const [result] = await repository.converge('user-missing', 'post-1', [
      { kind: SocialEdgeKind.LIKE, present: true },
    ]);

    expect(result.affected).toBe(0);
  });

  it('should converge to the last Postgres state whatever the order of two jobs', async () => {
    // Etat final voulu : pas de like. Les deux jobs (like, unlike) lisent cet etat, dans n'importe quel ordre.
    const finalState = [{ kind: SocialEdgeKind.LIKE, present: false }];

    await repository.converge('user-a', 'post-1', finalState);
    await repository.converge('user-a', 'post-1', finalState);

    expect((await interactions.getPostLikers(POST_1, PAGINATION)).ids).toEqual([]);
  });

  it('should follow and unfollow', async () => {
    await repository.converge('user-a', 'user-b', [{ kind: SocialEdgeKind.FOLLOW, present: true }]);
    expect((await relationships.getFollows(USER_A, PAGINATION)).ids).toEqual(['user-b']);

    await repository.converge('user-a', 'user-b', [
      { kind: SocialEdgeKind.FOLLOW, present: false },
    ]);
    expect((await relationships.getFollows(USER_A, PAGINATION)).ids).toEqual([]);
  });

  it('should participate and drop the wish in one transaction', async () => {
    await participations.createWish(USER_A, EVENT_1);

    const results = await repository.converge('user-a', 'event-1', [
      { kind: SocialEdgeKind.PARTICIPATE, present: true },
      { kind: SocialEdgeKind.WISH, present: false },
    ]);

    expect(results.map((r) => r.affected)).toEqual([1, 1]);
    expect(await participations.participationExists(USER_A, EVENT_1)).toBe(true);
    expect(await participations.wishExists(USER_A, EVENT_1)).toBe(false);
  });

  it('should keep the first registeredAt when a participation is applied twice', async () => {
    const state = [{ kind: SocialEdgeKind.PARTICIPATE, present: true }];

    await repository.converge('user-a', 'event-1', state);
    await repository.converge('user-a', 'event-1', state);

    const participants = await participations.getEventParticipants(EVENT_1, PAGINATION);
    expect(participants.ids).toEqual(['user-a']);
  });
});
