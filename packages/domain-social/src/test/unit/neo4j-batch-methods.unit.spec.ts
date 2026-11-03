import { describe, it, expect, afterEach, jest } from '@jest/globals';
import { Neo4jInteractionRepository } from '../../repositories/neo4j-interaction.repository.js';
import { Neo4jParticipationRepository } from '../../repositories/neo4j-participation.repository.js';
import { InteractionService } from '../../services/interaction.service.js';
import { ParticipationService } from '../../services/participation.service.js';
import { MAX_SOCIAL_BATCH_IDS } from '../../constants.js';
import {
  EventParticipantCountVO,
  PostLikeSummaryVO,
} from '../../value-objects/batch-results.vo.js';
import { createNeo4jProviderMock } from '../__test-utils__/mocks/neo4j-provider.mock.js';
import { createInteractionRepositoryMock } from '../__test-utils__/mocks/interaction.repository.mock.js';
import { createParticipationRepositoryMock } from '../__test-utils__/mocks/participation.repository.mock.js';
import { createEventQueueRepositoryMock } from '../__test-utils__/mocks/event-queue.repository.mock.js';
import {
  UserIdFactory,
  PostIdFactory,
  EventIdFactory,
} from '../__test-utils__/factories/ids.factory.js';

const record = (values: Record<string, unknown>) => ({ get: (key: string) => values[key] });

describe('Neo4jInteractionRepository.getPostsLikeSummary', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('lit tous les posts en une seule requete UNWIND parametree', async () => {
    const mock = createNeo4jProviderMock([
      record({ postId: 'p1', likeCount: 3, likedByMe: true }),
      record({ postId: 'p2', likeCount: 0, likedByMe: false }),
    ]);
    const repo = new Neo4jInteractionRepository(mock.provider);

    const result = await repo.getPostsLikeSummary('u1', ['p1', 'p2']);

    expect(result).toEqual([
      new PostLikeSummaryVO('p1', 3, true),
      new PostLikeSummaryVO('p2', 0, false),
    ]);
    expect(mock.run).toHaveBeenCalledTimes(1);
    const [cypher, params] = mock.run.mock.calls[0] ?? ['', {}];
    expect(cypher).toContain('UNWIND $postIds');
    expect(cypher).toContain('OPTIONAL MATCH');
    expect(params).toEqual({ postIds: ['p1', 'p2'], userId: 'u1' });
  });

  it('dedoublonne, ignore les ids vides et plafonne sans lever', async () => {
    const mock = createNeo4jProviderMock();
    const repo = new Neo4jInteractionRepository(mock.provider);
    const ids = Array.from({ length: MAX_SOCIAL_BATCH_IDS + 30 }, (_, i) => `p-${i.toString()}`);

    await repo.getPostsLikeSummary('u1', ['', ...ids, 'p-0']);

    const params = mock.run.mock.calls[0]?.[1] as { postIds: string[] };
    expect(params.postIds).toEqual(ids.slice(0, MAX_SOCIAL_BATCH_IDS));
  });

  it('ne requete pas pour une liste vide', async () => {
    const mock = createNeo4jProviderMock();

    expect(
      await new Neo4jInteractionRepository(mock.provider).getPostsLikeSummary('u1', []),
    ).toEqual([]);
    expect(mock.run).not.toHaveBeenCalled();
  });

  it('convertit les entiers neo4j en nombres', async () => {
    const mock = createNeo4jProviderMock([
      record({ postId: 'p1', likeCount: { toNumber: () => 7 }, likedByMe: false }),
    ]);

    const result = await new Neo4jInteractionRepository(mock.provider).getPostsLikeSummary('u', [
      'p1',
    ]);

    expect(result[0]?.likeCount).toBe(7);
  });
});

describe('Neo4jParticipationRepository.countParticipantsByEventIds', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('compte les relations PARTICIPATE par evenement en une requete', async () => {
    const mock = createNeo4jProviderMock([
      record({ eventId: 'e1', participantCount: { toNumber: () => 4 } }),
      record({ eventId: 'e2', participantCount: 0 }),
    ]);
    const repo = new Neo4jParticipationRepository(mock.provider);

    const result = await repo.countParticipantsByEventIds(['e1', 'e2']);

    expect(result).toEqual([
      new EventParticipantCountVO('e1', 4),
      new EventParticipantCountVO('e2', 0),
    ]);
    expect(mock.run).toHaveBeenCalledTimes(1);
    const [cypher, params] = mock.run.mock.calls[0] ?? ['', {}];
    expect(cypher).toContain('UNWIND $eventIds');
    expect(cypher).toContain('PARTICIPATE');
    expect(cypher).not.toContain('CREATED');
    expect(params).toEqual({ eventIds: ['e1', 'e2'] });
  });

  it('dedoublonne et plafonne a MAX_SOCIAL_BATCH_IDS', async () => {
    const mock = createNeo4jProviderMock();
    const repo = new Neo4jParticipationRepository(mock.provider);
    const ids = Array.from({ length: MAX_SOCIAL_BATCH_IDS + 5 }, (_, i) => `e-${i.toString()}`);

    await repo.countParticipantsByEventIds([...ids, 'e-1']);

    const params = mock.run.mock.calls[0]?.[1] as { eventIds: string[] };
    expect(params.eventIds).toHaveLength(MAX_SOCIAL_BATCH_IDS);
  });

  it('ne requete pas pour une liste vide', async () => {
    const mock = createNeo4jProviderMock();

    expect(
      await new Neo4jParticipationRepository(mock.provider).countParticipantsByEventIds([]),
    ).toEqual([]);
    expect(mock.run).not.toHaveBeenCalled();
  });
});

describe('Services par lot', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('InteractionService.getPostsLikeSummary delegue en un appel', async () => {
    const repository = createInteractionRepositoryMock();
    const service = new InteractionService(repository, createEventQueueRepositoryMock());
    const summaries = [new PostLikeSummaryVO('p1', 1, true)];
    const spy = jest.spyOn(repository, 'getPostsLikeSummary').mockResolvedValue(summaries);

    const result = await service.getPostsLikeSummary(UserIdFactory.build('u1'), [
      PostIdFactory.build('p1'),
    ]);

    expect(result).toEqual(summaries);
    expect(spy).toHaveBeenCalledWith('u1', ['p1']);
  });

  it('InteractionService.getPostsLikeSummary traduit les erreurs en DATABASE_ERROR', async () => {
    const repository = createInteractionRepositoryMock();
    const service = new InteractionService(repository, createEventQueueRepositoryMock());
    jest.spyOn(repository, 'getPostsLikeSummary').mockRejectedValue(new Error('boom'));

    await expect(
      service.getPostsLikeSummary(UserIdFactory.build('u1'), [PostIdFactory.build('p1')]),
    ).rejects.toMatchObject({ code: 'DATABASE_ERROR' });
  });

  it('ParticipationService.countParticipantsByEventIds delegue en un appel', async () => {
    const repository = createParticipationRepositoryMock();
    const service = new ParticipationService(repository, createEventQueueRepositoryMock());
    const counts = [new EventParticipantCountVO('e1', 2)];
    const spy = jest.spyOn(repository, 'countParticipantsByEventIds').mockResolvedValue(counts);

    const result = await service.countParticipantsByEventIds([EventIdFactory.build('e1')]);

    expect(result).toEqual(counts);
    expect(spy).toHaveBeenCalledWith(['e1']);
  });

  it('les services ne touchent pas au repository pour une liste vide', async () => {
    const interaction = createInteractionRepositoryMock();
    const participation = createParticipationRepositoryMock();
    const queue = createEventQueueRepositoryMock();
    const interactionSpy = jest.spyOn(interaction, 'getPostsLikeSummary');
    const participationSpy = jest.spyOn(participation, 'countParticipantsByEventIds');

    expect(
      await new InteractionService(interaction, queue).getPostsLikeSummary(
        UserIdFactory.build(),
        [],
      ),
    ).toEqual([]);
    expect(
      await new ParticipationService(participation, queue).countParticipantsByEventIds([]),
    ).toEqual([]);
    expect(interactionSpy).not.toHaveBeenCalled();
    expect(participationSpy).not.toHaveBeenCalled();
  });
});
