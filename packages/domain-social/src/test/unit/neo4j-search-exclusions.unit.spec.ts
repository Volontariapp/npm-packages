import { describe, it, expect, afterEach, jest } from '@jest/globals';
import { Neo4jParticipationRepository } from '../../repositories/neo4j-participation.repository.js';
import { MAX_SEARCH_EXCLUSION_IDS } from '../../constants.js';
import { SearchExclusionsVO } from '../../value-objects/search-exclusions.vo.js';
import { createNeo4jProviderMock } from '../__test-utils__/mocks/neo4j-provider.mock.js';

const record = (id: string) => ({ get: (key: string) => (key === 'id' ? id : undefined) });
const records = (count: number, prefix = 'id') =>
  Array.from({ length: count }, (_, i) => record(`${prefix}-${i.toString().padStart(4, '0')}`));

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
    const mock = createNeo4jProviderMock([record('e1'), record('e2')]);
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
    expect(params).toMatchObject({ userId: 'u1' });
    expect(result.excludedEventIds).toEqual(['e1', 'e2']);
    expect(result.hiddenUserIds).toEqual([]);
  });

  it('lit les blocages dans les deux sens avec une requete non orientee', async () => {
    const mock = createNeo4jProviderMock([record('b1')]);
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
    expect(result.hiddenUserIds).toEqual(['b1']);
    expect(result.excludedEventIds).toEqual([]);
  });

  it('lance les deux requetes quand les deux familles sont demandees', async () => {
    const mock = createNeo4jProviderMock([record('x1')]);
    const repo = new Neo4jParticipationRepository(mock.provider);

    const result = await repo.getSearchExclusions(
      'u1',
      { excludeParticipatedByMe: true, excludeBlockedUsers: true },
      MAX_SEARCH_EXCLUSION_IDS,
    );

    expect(mock.run).toHaveBeenCalledTimes(2);
    expect(result.excludedEventIds).toEqual(['x1']);
    expect(result.hiddenUserIds).toEqual(['x1']);
  });

  it('demande un resultat de plus que le plafond pour detecter la troncature', async () => {
    const mock = createNeo4jProviderMock();
    const repo = new Neo4jParticipationRepository(mock.provider);

    await repo.getSearchExclusions('u1', { excludeCreatedByMe: true }, 3);

    const params = mock.run.mock.calls[0]?.[1] as { limit: { toNumber(): number } };
    expect(params.limit.toNumber()).toBe(4);
  });

  it('tronque au plafond et leve le drapeau quand il y a plus de resultats', async () => {
    const mock = createNeo4jProviderMock(records(4, 'e'));
    const repo = new Neo4jParticipationRepository(mock.provider);

    const result = await repo.getSearchExclusions('u1', { excludeCreatedByMe: true }, 3);

    expect(result.excludedEventIds).toEqual(['e-0000', 'e-0001', 'e-0002']);
    expect(result.excludedEventIdsTruncated).toBe(true);
    expect(result.hiddenUserIdsTruncated).toBe(false);
  });

  it('ne leve pas le drapeau quand le resultat tient exactement dans le plafond', async () => {
    const mock = createNeo4jProviderMock(records(3, 'u'));
    const repo = new Neo4jParticipationRepository(mock.provider);

    const result = await repo.getSearchExclusions('u1', { excludeBlockedUsers: true }, 3);

    expect(result.hiddenUserIds).toHaveLength(3);
    expect(result.hiddenUserIdsTruncated).toBe(false);
  });
});
