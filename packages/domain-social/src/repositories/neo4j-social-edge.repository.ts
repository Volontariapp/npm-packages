import { Injectable, Inject } from '@nestjs/common';
import { NestNeo4jProvider, NEST_NEO4J_PROVIDER } from '@volontariapp/bridge-nest';
import { DATABASE_QUERY_ERROR } from '@volontariapp/errors-nest';
import { SocialEdgeKind } from '@volontariapp/messaging';
import { Neo4jBaseRepository, toSafeInt } from './base/neo4j-base.repository.js';
import type {
  ISocialEdgeGraphRepository,
  SocialEdgeGraphResult,
  SocialEdgeTargetState,
} from './interfaces/social-edge-graph.repository.js';

interface EdgeShape {
  relationship: string;
  targetLabel: string;
  targetKey: string;
  onCreate?: string;
}

/** Table figee : le type de relation et les labels ne se parametrent pas en Cypher. */
const EDGE_SHAPES: Readonly<Record<SocialEdgeKind, EdgeShape>> = {
  [SocialEdgeKind.LIKE]: { relationship: 'LIKE', targetLabel: 'SocialPost', targetKey: 'postId' },
  [SocialEdgeKind.FOLLOW]: {
    relationship: 'FOLLOW',
    targetLabel: 'SocialUser',
    targetKey: 'userId',
  },
  [SocialEdgeKind.WISH]: {
    relationship: 'WISH_TO_PARTICIPATE',
    targetLabel: 'SocialEvent',
    targetKey: 'eventId',
  },
  [SocialEdgeKind.PARTICIPATE]: {
    relationship: 'PARTICIPATE',
    targetLabel: 'SocialEvent',
    targetKey: 'eventId',
    onCreate: 'ON CREATE SET r.registeredAt = datetime()',
  },
};

export function buildPresentCypher(kind: SocialEdgeKind): string {
  const shape = EDGE_SHAPES[kind];
  return `MATCH (u:SocialUser {userId: $fromId})
       MATCH (t:${shape.targetLabel} {${shape.targetKey}: $toId})
       MERGE (u)-[r:${shape.relationship}]->(t)
       ${shape.onCreate ?? ''}
       RETURN count(*) AS applied`;
}

export function buildAbsentCypher(kind: SocialEdgeKind): string {
  const shape = EDGE_SHAPES[kind];
  return `MATCH (:SocialUser {userId: $fromId})-[r:${shape.relationship}]->(:${shape.targetLabel} {${shape.targetKey}: $toId})
       DELETE r
       RETURN count(*) AS applied`;
}

@Injectable()
export class Neo4jSocialEdgeRepository
  extends Neo4jBaseRepository
  implements ISocialEdgeGraphRepository
{
  constructor(
    @Inject(NEST_NEO4J_PROVIDER)
    provider: NestNeo4jProvider,
  ) {
    super(provider);
  }

  async converge(
    fromId: string,
    toId: string,
    states: SocialEdgeTargetState[],
  ): Promise<SocialEdgeGraphResult[]> {
    const session = this.provider.getDriver().session();
    try {
      return await session.executeWrite(async (tx) => {
        const results: SocialEdgeGraphResult[] = [];
        for (const state of states) {
          const cypher = state.present
            ? buildPresentCypher(state.kind)
            : buildAbsentCypher(state.kind);
          const result = await tx.run(cypher, { fromId, toId });
          results.push({
            kind: state.kind,
            present: state.present,
            affected: toSafeInt(result.records[0]?.get('applied')),
          });
        }
        return results;
      });
    } catch (error: unknown) {
      throw DATABASE_QUERY_ERROR((error as Error).message);
    } finally {
      await session.close();
    }
  }
}
