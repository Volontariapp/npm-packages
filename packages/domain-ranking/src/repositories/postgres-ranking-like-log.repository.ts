import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from '@volontariapp/database';
import { BaseRepository } from '@volontariapp/database';
import type { TransactionManager } from './sql.js';
import { RankingLikeLogEntity } from '../entities/index.js';
import { LikeOrigin } from '../enums/index.js';
import { RankingLikeLogModel } from '../models/index.js';
import type {
  ActiveLike,
  IRankingLikeLogRepository,
  ReconcileResult,
} from './interfaces/index.js';
import type { Queryable } from './sql.js';
import { rowsOf, uniqueUuids } from './sql.js';

/**
 * Journal of the likes with their date (the graph has none). The order of the stream events
 * does not matter: like and unlike are separate streams, and each write only moves a row
 * forward in time. The graph stays the truth for the existence of a like.
 */
@Injectable()
export class PostgresRankingLikeLogRepository
  extends BaseRepository<RankingLikeLogModel, RankingLikeLogEntity>
  implements IRankingLikeLogRepository
{
  constructor(
    @InjectRepository(RankingLikeLogModel)
    repository: Repository<RankingLikeLogModel>,
  ) {
    super(repository, RankingLikeLogEntity, RankingLikeLogModel);
  }

  async recordLike(
    params: { userId: string; postId: string; occurredAt: Date; origin?: LikeOrigin },
    executor: Queryable = this.repository.manager,
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

  async recordUnlike(
    params: { userId: string; postId: string; at: Date },
    executor: Queryable = this.repository.manager,
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
    executor: Queryable = this.repository.manager,
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

  async reconcileWithGraph(
    params: {
      userId: string;
      graphPostIds: readonly string[];
      graphIsComplete: boolean;
      fallbackAt: Date;
    },
    executor: Queryable = this.repository.manager,
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

  async purgeByUser(
    userId: string,
    manager: TransactionManager = this.repository.manager,
  ): Promise<number> {
    const result = await manager.delete(RankingLikeLogModel, { userId });
    return result.affected ?? 0;
  }
}
