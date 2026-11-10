import { Injectable } from '@nestjs/common';
import type { EntityManager } from '@volontariapp/database';
import { SocialEdgeKind } from '@volontariapp/messaging';
import { SOCIAL_EDGE_TABLE } from '../constants.js';
import type { ISocialEdgeRepository } from './interfaces/social-edge.repository.js';

interface CountRow {
  n: number | string;
}

function toCount(rows: unknown): number {
  if (!Array.isArray(rows) || rows.length === 0) return 0;
  const first = rows[0] as CountRow;
  return Number(first.n);
}

const ALL_KINDS = Object.values(SocialEdgeKind);

/**
 * Les trois ecritures passent par un `WITH ... RETURNING ... SELECT count(*)` : TypeORM renvoie
 * `[lignes, nombre]` pour un DELETE brut et `lignes` pour un INSERT, ce qui rend le resultat
 * ambigu ; un SELECT final a la meme forme dans tous les cas.
 */
@Injectable()
export class PostgresSocialEdgeRepository implements ISocialEdgeRepository {
  async insertIfAbsent(
    manager: EntityManager,
    kind: SocialEdgeKind,
    fromId: string,
    toId: string,
  ): Promise<boolean> {
    const rows: unknown = await manager.query(
      `WITH inserted AS (
         INSERT INTO ${SOCIAL_EDGE_TABLE} (kind, from_id, to_id)
         VALUES ($1, $2, $3)
         ON CONFLICT DO NOTHING
         RETURNING 1
       )
       SELECT count(*)::int AS n FROM inserted`,
      [kind, fromId, toId],
    );
    return toCount(rows) > 0;
  }

  async deleteIfPresent(
    manager: EntityManager,
    kind: SocialEdgeKind,
    fromId: string,
    toId: string,
  ): Promise<boolean> {
    const rows: unknown = await manager.query(
      `WITH removed AS (
         DELETE FROM ${SOCIAL_EDGE_TABLE}
         WHERE kind = $1 AND from_id = $2 AND to_id = $3
         RETURNING 1
       )
       SELECT count(*)::int AS n FROM removed`,
      [kind, fromId, toId],
    );
    return toCount(rows) > 0;
  }

  async exists(
    manager: EntityManager,
    kind: SocialEdgeKind,
    fromId: string,
    toId: string,
  ): Promise<boolean> {
    const rows: unknown = await manager.query(
      `SELECT count(*)::int AS n FROM ${SOCIAL_EDGE_TABLE}
       WHERE kind = $1 AND from_id = $2 AND to_id = $3`,
      [kind, fromId, toId],
    );
    return toCount(rows) > 0;
  }

  async deleteByNode(manager: EntityManager, nodeId: string): Promise<number> {
    const rows: unknown = await manager.query(
      `WITH removed AS (
         DELETE FROM ${SOCIAL_EDGE_TABLE}
         WHERE (kind = ANY($2) AND from_id = $1) OR (kind = ANY($2) AND to_id = $1)
         RETURNING 1
       )
       SELECT count(*)::int AS n FROM removed`,
      [nodeId, ALL_KINDS],
    );
    return toCount(rows);
  }
}
