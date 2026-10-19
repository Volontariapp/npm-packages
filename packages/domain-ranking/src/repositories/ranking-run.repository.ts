import type { DataSource } from 'typeorm';
import type { RankingListKind } from '../enums/index.js';
import { RankingRunModel } from '../models/index.js';
import type { Queryable } from './sql.js';
import { rowsOf } from './sql.js';

export type ListFreshness = 'MISSING' | 'STALE' | 'FRESH';

export interface ActiveUser {
  userId: string;
  /** Text with microseconds: pass it back as the cursor of the next page. */
  computedAt: string;
}

export interface ActiveUsersCursor {
  computedAt: string;
  userId: string;
}

export class RankingRunRepository {
  constructor(private readonly dataSource: DataSource) {}

  find(userId: string, listKind: RankingListKind): Promise<RankingRunModel | null> {
    return this.dataSource.getRepository(RankingRunModel).findOne({ where: { userId, listKind } });
  }

  /**
   * Step 0 of a computation: true when a list computed from a state later than the request
   * already exists (`started_at >= requestedAt`) with the current formula. The job is then
   * skipped. Compared in SQL: JavaScript would truncate the microseconds.
   */
  async isUpToDate(
    params: {
      userId: string;
      listKind: RankingListKind;
      requestedAt: string;
      formulaVersion: number;
    },
    executor: Queryable = this.dataSource.manager,
  ): Promise<boolean> {
    const rows = rowsOf<{ up_to_date: boolean }>(
      await executor.query(
        `SELECT (started_at >= $3::timestamptz AND formula_version = $4::integer) AS up_to_date
         FROM ranking_run WHERE user_id = $1::uuid AND list_kind = $2::varchar`,
        [params.userId, params.listKind, params.requestedAt, params.formulaVersion],
      ),
    );
    return rows.at(0)?.up_to_date ?? false;
  }

  /**
   * A list is never removed by ageing: it is served stale. MISSING means a cold start (206);
   * STALE (older than the delay, or another formula version) asks for a STALE_REFRESH.
   */
  async freshness(
    params: {
      userId: string;
      listKind: RankingListKind;
      maxAgeHours: number;
      formulaVersion: number;
    },
    executor: Queryable = this.dataSource.manager,
  ): Promise<ListFreshness> {
    const rows = rowsOf<{ stale: boolean }>(
      await executor.query(
        `SELECT (computed_at < now() - make_interval(hours => $3::integer)
                 OR formula_version <> $4::integer) AS stale
         FROM ranking_run WHERE user_id = $1::uuid AND list_kind = $2::varchar`,
        [params.userId, params.listKind, params.maxAgeHours, params.formulaVersion],
      ),
    );
    const row = rows.at(0);
    if (!row) return 'MISSING';
    return row.stale ? 'STALE' : 'FRESH';
  }

  /** Fan-out: active users of a list, most recent first, paged by cursor (never OFFSET). */
  async listActiveUsers(
    params: {
      listKind: RankingListKind;
      days: number;
      limit: number;
      after?: ActiveUsersCursor;
    },
    executor: Queryable = this.dataSource.manager,
  ): Promise<ActiveUser[]> {
    const rows = rowsOf<{ user_id: string; computed_at: string }>(
      await executor.query(
        `SELECT user_id, computed_at::text AS computed_at
         FROM ranking_run
         WHERE list_kind = $1::varchar
           AND computed_at > now() - make_interval(days => $2::integer)
           AND ($3::timestamptz IS NULL OR (computed_at, user_id) < ($3::timestamptz, $4::uuid))
         ORDER BY computed_at DESC, user_id DESC
         LIMIT $5::integer`,
        [
          params.listKind,
          params.days,
          params.after?.computedAt ?? null,
          params.after?.userId ?? null,
          params.limit,
        ],
      ),
    );
    return rows.map((row) => ({ userId: row.user_id, computedAt: row.computed_at }));
  }
}
