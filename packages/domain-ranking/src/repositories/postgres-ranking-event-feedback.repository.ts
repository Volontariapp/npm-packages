import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from '@volontariapp/database';
import { BaseRepository } from '@volontariapp/database';
import type { TransactionManager } from './sql.js';
import { MAX_FEEDBACK_ITEMS } from '../constants/index.js';
import { RankingEventFeedbackEntity } from '../entities/index.js';
import { FeedbackBatchTooLargeException } from '../exceptions/index.js';
import { FeedbackAction } from '../enums/index.js';
import { RankingEventFeedbackModel } from '../models/index.js';
import type { IRankingEventFeedbackRepository } from './interfaces/index.js';
import type { Queryable } from './sql.js';
import { countMap, rowsOf, uniqueUuids } from './sql.js';

/** Swipes to the left (PASS): exclusion for a cooldown and input of the popularity. */
@Injectable()
export class PostgresRankingEventFeedbackRepository
  extends BaseRepository<RankingEventFeedbackModel, RankingEventFeedbackEntity>
  implements IRankingEventFeedbackRepository
{
  constructor(
    @InjectRepository(RankingEventFeedbackModel)
    repository: Repository<RankingEventFeedbackModel>,
  ) {
    super(repository, RankingEventFeedbackEntity, RankingEventFeedbackModel);
  }

  async recordPasses(
    userId: string,
    eventIds: readonly string[],
    executor: Queryable = this.repository.manager,
  ): Promise<number> {
    if (eventIds.length > MAX_FEEDBACK_ITEMS) throw new FeedbackBatchTooLargeException(eventIds.length);
    const ids = uniqueUuids(eventIds);
    if (ids.length === 0) return 0;
    const rows = rowsOf<unknown>(
      await executor.query(
        `INSERT INTO ranking_event_feedback (user_id, event_id, action, created_at)
         SELECT $1::uuid, e, $3::varchar, now() FROM unnest($2::uuid[]) AS e
         ON CONFLICT (user_id, event_id) DO UPDATE SET action = EXCLUDED.action, created_at = now()
         RETURNING 1`,
        [userId, ids, FeedbackAction.PASS],
      ),
    );
    return rows.length;
  }

  async listRecentPassedEventIds(
    userId: string,
    days: number,
    executor: Queryable = this.repository.manager,
  ): Promise<string[]> {
    const rows = rowsOf<{ event_id: string }>(
      await executor.query(
        `SELECT event_id FROM ranking_event_feedback
         WHERE user_id = $1::uuid AND action = 'PASS'
           AND created_at > now() - make_interval(days => $2::integer)
         ORDER BY created_at DESC`,
        [userId, days],
      ),
    );
    return rows.map((row) => row.event_id);
  }

  async countPasses(
    eventIds: readonly string[],
    executor: Queryable = this.repository.manager,
  ): Promise<Map<string, number>> {
    const ids = uniqueUuids(eventIds);
    if (ids.length === 0) return new Map();
    return countMap(
      rowsOf<{ id: string; total: string }>(
        await executor.query(
          `SELECT event_id AS id, count(*) AS total FROM ranking_event_feedback
           WHERE event_id = ANY($1::uuid[]) AND action = 'PASS' GROUP BY event_id`,
          [ids],
        ),
      ),
    );
  }

  async purgeByUser(
    userId: string,
    manager: TransactionManager = this.repository.manager,
  ): Promise<number> {
    const result = await manager.delete(RankingEventFeedbackModel, { userId });
    return result.affected ?? 0;
  }
}
