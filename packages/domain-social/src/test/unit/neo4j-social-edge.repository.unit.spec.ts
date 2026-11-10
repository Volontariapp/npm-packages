import { jest, describe, it, expect } from '@jest/globals';
import { SocialEdgeKind } from '@volontariapp/messaging';
import {
  Neo4jSocialEdgeRepository,
  buildAbsentCypher,
  buildPresentCypher,
} from '../../repositories/neo4j-social-edge.repository.js';
import { createNeo4jProviderMock } from '../__test-utils__/mocks/neo4j-provider.mock.js';

const applied = (n: number) => ({ get: (key: string) => (key === 'applied' ? n : undefined) });

describe('Neo4jSocialEdgeRepository (Unit)', () => {
  it('should MERGE a present like with both nodes matched', () => {
    const cypher = buildPresentCypher(SocialEdgeKind.LIKE);
    expect(cypher).toContain('MATCH (u:SocialUser {userId: $fromId})');
    expect(cypher).toContain('MATCH (t:SocialPost {postId: $toId})');
    expect(cypher).toContain('MERGE (u)-[r:LIKE]->(t)');
    expect(cypher).toContain('RETURN count(*) AS applied');
  });

  it('should DELETE an absent like and count the removed relationships', () => {
    const cypher = buildAbsentCypher(SocialEdgeKind.LIKE);
    expect(cypher).toContain('-[r:LIKE]->(:SocialPost {postId: $toId})');
    expect(cypher).toContain('DELETE r');
    expect(cypher).toContain('RETURN count(*) AS applied');
  });

  it('should keep the existing relationship names and registeredAt for participations', () => {
    expect(buildPresentCypher(SocialEdgeKind.WISH)).toContain('[r:WISH_TO_PARTICIPATE]');
    const participate = buildPresentCypher(SocialEdgeKind.PARTICIPATE);
    expect(participate).toContain('[r:PARTICIPATE]');
    expect(participate).toContain('ON CREATE SET r.registeredAt = datetime()');
    expect(buildPresentCypher(SocialEdgeKind.FOLLOW)).toContain(
      'MATCH (t:SocialUser {userId: $toId})',
    );
  });

  it('should run every state of the couple in one write transaction', async () => {
    const mock = createNeo4jProviderMock([applied(1)]);
    const repository = new Neo4jSocialEdgeRepository(mock.provider);

    const results = await repository.converge('u1', 'e1', [
      { kind: SocialEdgeKind.PARTICIPATE, present: true },
      { kind: SocialEdgeKind.WISH, present: false },
    ]);

    expect(jest.spyOn(mock.provider.getDriver(), 'session')).toHaveBeenCalledTimes(1);
    expect(jest.spyOn(mock, 'run')).toHaveBeenCalledTimes(2);
    expect(jest.spyOn(mock, 'run')).toHaveBeenNthCalledWith(1, buildPresentCypher(SocialEdgeKind.PARTICIPATE), {
      fromId: 'u1',
      toId: 'e1',
    });
    expect(jest.spyOn(mock, 'run')).toHaveBeenNthCalledWith(2, buildAbsentCypher(SocialEdgeKind.WISH), {
      fromId: 'u1',
      toId: 'e1',
    });
    expect(results).toEqual([
      { kind: SocialEdgeKind.PARTICIPATE, present: true, affected: 1 },
      { kind: SocialEdgeKind.WISH, present: false, affected: 1 },
    ]);
  });

  it('should report 0 when a node is missing so the caller can retry', async () => {
    const mock = createNeo4jProviderMock([applied(0)]);
    const repository = new Neo4jSocialEdgeRepository(mock.provider);

    const [result] = await repository.converge('u1', 'p1', [
      { kind: SocialEdgeKind.LIKE, present: true },
    ]);

    expect(result.affected).toBe(0);
  });

  it('should wrap a driver failure in DATABASE_QUERY_ERROR', async () => {
    const mock = createNeo4jProviderMock();
    mock.run.mockRejectedValue(new Error('pool exhausted'));
    const repository = new Neo4jSocialEdgeRepository(mock.provider);

    await expect(
      repository.converge('u1', 'p1', [{ kind: SocialEdgeKind.LIKE, present: true }]),
    ).rejects.toMatchObject({ code: 'DATABASE_QUERY_ERROR' });
  });
});
