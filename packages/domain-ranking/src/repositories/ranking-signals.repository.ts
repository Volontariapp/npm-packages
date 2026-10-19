import type { DataSource } from 'typeorm';
import { FeedbackAction } from '../enums/index.js';
import { MAX_FEEDBACK_ITEMS } from '../constants/index.js';
import type { Queryable } from './sql.js';
import { rowsOf, uniqueUuids } from './sql.js';

export class FeedbackBatchTooLargeError extends Error {
  constructor(size: number) {
    super(`A feedback batch holds ${String(MAX_FEEDBACK_ITEMS)} items at most, got ${String(size)}`);
    this.name = 'FeedbackBatchTooLargeError';
  }
}

const countMap = (rows: ReadonlyArray<{ id: string; total: string }>): Map<string, number> =>
  new Map(rows.map((row) => [row.id, Number(row.total)]));

/** Swipes to the left (PASS): exclusion for a cooldown and input of the popularity. */
export class EventFeedbackRepository {
  constructor(private readonly dataSource: DataSource) {}

  /** Records a batch of PASS (50 at most). Replaying a batch only refreshes the dates. */
  async recordPasses(
    userId: string,
    eventIds: readonly string[],
    executor: Queryable = this.dataSource.manager,
  ): Promise<number> {
    if (eventIds.length > MAX_FEEDBACK_ITEMS) throw new FeedbackBatchTooLargeError(eventIds.length);
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

  /** Events passed less than `days` ago: removed from the candidates. */
  async listRecentPassedEventIds(
    userId: string,
    days: number,
    executor: Queryable = this.dataSource.manager,
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
    executor: Queryable = this.dataSource.manager,
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
}

/** Active wishes. A count of rows stays idempotent when a stream message is replayed. */
export class EventWishRepository {
  constructor(private readonly dataSource: DataSource) {}

  async add(userId: string, eventId: string, executor: Queryable = this.dataSource.manager): Promise<void> {
    await executor.query(
      `INSERT INTO ranking_event_wish (user_id, event_id) VALUES ($1::uuid, $2::uuid)
       ON CONFLICT (user_id, event_id) DO NOTHING`,
      [userId, eventId],
    );
  }

  async remove(userId: string, eventId: string, executor: Queryable = this.dataSource.manager): Promise<void> {
    await executor.query(`DELETE FROM ranking_event_wish WHERE user_id = $1::uuid AND event_id = $2::uuid`, [
      userId,
      eventId,
    ]);
  }

  async countByEvents(
    eventIds: readonly string[],
    executor: Queryable = this.dataSource.manager,
  ): Promise<Map<string, number>> {
    const ids = uniqueUuids(eventIds);
    if (ids.length === 0) return new Map();
    return countMap(
      rowsOf<{ id: string; total: string }>(
        await executor.query(
          `SELECT event_id AS id, count(*) AS total FROM ranking_event_wish
           WHERE event_id = ANY($1::uuid[]) GROUP BY event_id`,
          [ids],
        ),
      ),
    );
  }
}

/** Posts linked to an event: the popularity counts the distinct authors, not the posts. */
export class EventMentionRepository {
  constructor(private readonly dataSource: DataSource) {}

  async add(
    mention: { postId: string; eventId: string; authorId: string },
    executor: Queryable = this.dataSource.manager,
  ): Promise<void> {
    await executor.query(
      `INSERT INTO ranking_event_mention (post_id, event_id, author_id)
       VALUES ($1::uuid, $2::uuid, $3::uuid) ON CONFLICT (post_id) DO NOTHING`,
      [mention.postId, mention.eventId, mention.authorId],
    );
  }

  async removeByPost(postId: string, executor: Queryable = this.dataSource.manager): Promise<void> {
    await executor.query(`DELETE FROM ranking_event_mention WHERE post_id = $1::uuid`, [postId]);
  }

  async countDistinctAuthors(
    eventIds: readonly string[],
    windowDays: number,
    executor: Queryable = this.dataSource.manager,
  ): Promise<Map<string, number>> {
    const ids = uniqueUuids(eventIds);
    if (ids.length === 0) return new Map();
    return countMap(
      rowsOf<{ id: string; total: string }>(
        await executor.query(
          `SELECT event_id AS id, count(DISTINCT author_id) AS total FROM ranking_event_mention
           WHERE event_id = ANY($1::uuid[]) AND created_at > now() - make_interval(days => $2::integer)
           GROUP BY event_id`,
          [ids, windowDays],
        ),
      ),
    );
  }
}
