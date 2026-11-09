import { describe, it, expect, afterEach, jest } from '@jest/globals';
import { Neo4jParticipationRepository } from '../../repositories/neo4j-participation.repository.js';
import { MAX_SEARCH_EXCLUSION_IDS } from '../../constants.js';
import { SearchExclusionsVO } from '../../value-objects/search-exclusions.vo.js';
import { createNeo4jProviderMock } from '../__test-utils__/mocks/neo4j-provider.mock.js';

const row = (eventIds: string[], userIds: string[]) => ({
  get: (key: string) => {
    if (key === 'eventIds') return eventIds;
    if (key === 'userIds') return userIds;
    return undefined;
  },
});
const ids = (count: number, prefix: string): string[] =>
  Array.from({ length: count }, (_, i) => `${prefix}-${i.toString().padStart(4, '0')}`);

describe('Neo4jParticipationRepository.getSearchExclusions', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('ne requete pas Neo4j sans aucun drapeau', async () => {
    const mock = createNeo4jProviderMock();
    const repo = new Neo4jParticipationRepository(mock.provider);

    const result = await repo.getSearchExclusions('u1', {}, MAX_SEARCH_EXCLUSION_IDS);

    expect(result).toEqual(new SearchExclusionsVO([], [], false, false));
    expect(mock.run).not.toHaveBeenCalled();
  });

  it('ne lit que les relations demandees, en une seule requete', async () => {
    const mock = createNeo4jProviderMock([row(['e1', 'e2'], [])]);
    const repo = new Neo4jParticipationRepository(mock.provider);

    const result = await repo.getSearchExclusions(
      'u1',
      { excludeCreatedByMe: true, excludeWishedByMe: true },
      MAX_SEARCH_EXCLUSION_IDS,
    );

    expect(mock.run).toHaveBeenCalledTimes(1);
    const [cypher, params] = mock.run.mock.calls[0] ?? ['', {}];
    expect(cypher).toContain('[:CREATED|WISH_TO_PARTICIPATE]');
    expect(cypher).not.toContain('|PARTICIPATE');
    expect(cypher).not.toContain('BLOCK');
    expect(cypher).toContain('RETURN [] AS userIds');
    expect(params).toMatchObject({ userId: 'u1' });
    expect(result.excludedEventIds).toEqual(['e1', 'e2']);
    expect(result.hiddenUserIds).toEqual([]);
  });

  it('lit les blocages dans les deux sens avec une requete non orientee', async () => {
    const mock = createNeo4jProviderMock([row([], ['b1'])]);
    const repo = new Neo4jParticipationRepository(mock.provider);

    const result = await repo.getSearchExclusions(
      'u1',
      { excludeBlockedUsers: true },
      MAX_SEARCH_EXCLUSION_IDS,
    );

    expect(mock.run).toHaveBeenCalledTimes(1);
    const [cypher] = mock.run.mock.calls[0] ?? [''];
    expect(cypher).toContain('-[:BLOCK]-');
    expect(cypher).not.toContain('-[:BLOCK]->');
    expect(cypher).not.toContain('<-[:BLOCK]-');
    expect(cypher).toContain('RETURN [] AS eventIds');
    expect(result.hiddenUserIds).toEqual(['b1']);
    expect(result.excludedEventIds).toEqual([]);
  });

  it('lit les deux familles en une seule requete quand les deux sont demandees', async () => {
    const mock = createNeo4jProviderMock([row(['e1'], ['b1'])]);
    const repo = new Neo4jParticipationRepository(mock.provider);

    const result = await repo.getSearchExclusions(
      'u1',
      { excludeParticipatedByMe: true, excludeBlockedUsers: true },
      MAX_SEARCH_EXCLUSION_IDS,
    );

    expect(mock.run).toHaveBeenCalledTimes(1);
    const [cypher] = mock.run.mock.calls[0] ?? [''];
    expect(cypher).toContain('[:PARTICIPATE]');
    expect(cypher).toContain('-[:BLOCK]-');
    expect(result.excludedEventIds).toEqual(['e1']);
    expect(result.hiddenUserIds).toEqual(['b1']);
  });

  it('renvoie des listes vides si Neo4j ne renvoie aucune ligne', async () => {
    const mock = createNeo4jProviderMock([]);
    const repo = new Neo4jParticipationRepository(mock.provider);

    const result = await repo.getSearchExclusions(
      'u1',
      { excludeCreatedByMe: true, excludeBlockedUsers: true },
      MAX_SEARCH_EXCLUSION_IDS,
    );

    expect(result).toEqual(new SearchExclusionsVO([], [], false, false));
  });

  it('demande un resultat de plus que le plafond pour detecter la troncature', async () => {
    const mock = createNeo4jProviderMock([row([], [])]);
    const repo = new Neo4jParticipationRepository(mock.provider);

    await repo.getSearchExclusions('u1', { excludeCreatedByMe: true }, 3);

    const params = mock.run.mock.calls[0]?.[1] as { limit: { toNumber(): number } };
    expect(params.limit.toNumber()).toBe(4);
  });

  it('tronque au plafond et leve le drapeau quand il y a plus de resultats', async () => {
    const mock = createNeo4jProviderMock([row(ids(4, 'e'), [])]);
    const repo = new Neo4jParticipationRepository(mock.provider);

    const result = await repo.getSearchExclusions('u1', { excludeCreatedByMe: true }, 3);

    expect(result.excludedEventIds).toEqual(['e-0000', 'e-0001', 'e-0002']);
    expect(result.excludedEventIdsTruncated).toBe(true);
    expect(result.hiddenUserIdsTruncated).toBe(false);
  });

  it('ne leve pas le drapeau quand le resultat tient exactement dans le plafond', async () => {
    const mock = createNeo4jProviderMock([row([], ids(3, 'u'))]);
    const repo = new Neo4jParticipationRepository(mock.provider);

    const result = await repo.getSearchExclusions('u1', { excludeBlockedUsers: true }, 3);

    expect(result.hiddenUserIds).toHaveLength(3);
    expect(result.hiddenUserIdsTruncated).toBe(false);
  });
});
