import type { DataSource } from 'typeorm';
import { LikeOrigin } from '../enums/index.js';
import type { Queryable } from './sql.js';
import { rowsOf, uniqueUuids } from './sql.js';

export interface ActiveLike {
  postId: string;
  occurredAt: Date;
}

export interface ReconcileResult {
  tombstoned: number;
  backfilled: number;
}

/**
 * Journal of the likes with their date (the graph has none). The order of the stream events
 * does not matter: like and unlike are separate streams, and each write only moves a row
 * forward in time. The graph stays the truth for the existence of a like.
 */
export class RankingLikeLogRepository {
  constructor(private readonly dataSource: DataSource) {}

  async recordLike(
    params: { userId: string; postId: string; occurredAt: Date; origin?: LikeOrigin },
    executor: Queryable = this.dataSource.manager,
  ): Promise<void> {
    await executor.query(
      `INSERT INTO ranking_like_log AS l (user_id, post_id, occurred_at, deleted_at, origin)
       VALUES ($1::uuid, $2::uuid, $3::timestamptz, NULL, $4::varchar)
       ON CONFLICT (user_id, post_id) DO UPDATE
         SET occurred_at = GREATEST(l.occurred_at, EXCLUDED.occurred_at),
             deleted_at = NULL,
             origin = EXCLUDED.origin
         WHERE l.deleted_at IS NULL OR l.deleted_at < EXCLUDED.occurred_at`,
      [params.userId, params.postId, params.occurredAt, params.origin ?? LikeOrigin.STREAM],
    );
  }

  /** An unlike that arrives before its like creates a tombstone: the older like cannot revive it. */
  async recordUnlike(
    params: { userId: string; postId: string; at: Date },
    executor: Queryable = this.dataSource.manager,
  ): Promise<void> {
    await executor.query(
      `INSERT INTO ranking_like_log AS l (user_id, post_id, occurred_at, deleted_at, origin)
       VALUES ($1::uuid, $2::uuid, $3::timestamptz, $3::timestamptz, $4::varchar)
       ON CONFLICT (user_id, post_id) DO UPDATE
         SET deleted_at = EXCLUDED.deleted_at
         WHERE l.occurred_at < EXCLUDED.deleted_at`,
      [params.userId, params.postId, params.at, LikeOrigin.STREAM],
    );
  }

  async listActive(
    userId: string,
    limit: number,
    executor: Queryable = this.dataSource.manager,
  ): Promise<ActiveLike[]> {
    const rows = rowsOf<{ post_id: string; occurred_at: Date }>(
      await executor.query(
        `SELECT post_id, occurred_at FROM ranking_like_log
         WHERE user_id = $1::uuid AND deleted_at IS NULL
         ORDER BY occurred_at DESC LIMIT $2::integer`,
        [userId, limit],
      ),
    );
    return rows.map((row) => ({ postId: row.post_id, occurredAt: row.occurred_at }));
  }

  /**
   * Reconciles the journal with the likes read in the graph at each computation. A journal like
   * absent from the graph gets a tombstone; a graph like absent from the journal is added with
   * the BACKFILL origin and `fallbackAt` as its date. Tombstones are only laid when the graph
   * answer is complete (`graphIsComplete`): a capped answer would otherwise delete valid likes.
   */
  async reconcileWithGraph(
    params: {
      userId: string;
      graphPostIds: readonly string[];
      graphIsComplete: boolean;
      fallbackAt: Date;
    },
    executor: Queryable = this.dataSource.manager,
  ): Promise<ReconcileResult> {
    const graphIds = uniqueUuids(params.graphPostIds);
    let tombstoned = 0;
    if (params.graphIsComplete) {
      tombstoned = rowsOf<unknown>(
        await executor.query(
          `UPDATE ranking_like_log SET deleted_at = now()
           WHERE user_id = $1::uuid AND deleted_at IS NULL AND post_id <> ALL($2::uuid[])
           RETURNING 1`,
          [params.userId, graphIds],
        ),
      ).length;
    }
    const backfilled = rowsOf<unknown>(
      await executor.query(
        `INSERT INTO ranking_like_log AS l (user_id, post_id, occurred_at, deleted_at, origin)
         SELECT $1::uuid, p, $3::timestamptz, NULL, $4::varchar FROM unnest($2::uuid[]) AS p
         ON CONFLICT (user_id, post_id) DO UPDATE
           SET occurred_at = EXCLUDED.occurred_at, deleted_at = NULL, origin = EXCLUDED.origin
           WHERE l.deleted_at IS NOT NULL
         RETURNING 1`,
        [params.userId, graphIds, params.fallbackAt, LikeOrigin.BACKFILL],
      ),
    ).length;
    return { tombstoned, backfilled };
  }
}
