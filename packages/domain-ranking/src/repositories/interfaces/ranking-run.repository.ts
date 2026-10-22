import type { TransactionManager } from '../sql.js';
import type { RankingRunEntity } from '../../entities/index.js';
import type { RankingListKind } from '../../enums/index.js';

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

export interface IRankingRunRepository {
  findByKey(userId: string, listKind: RankingListKind): Promise<RankingRunEntity | null>;
  /**
   * Step 0 of a computation: true when a list computed from a state later than the request
   * already exists (`started_at >= requestedAt`) with the current formula. Compared in SQL.
   */
  isUpToDate(params: {
    userId: string;
    listKind: RankingListKind;
    requestedAt: string;
    formulaVersion: number;
  }): Promise<boolean>;
  /** A list is never removed by ageing: MISSING is a cold start, STALE asks for a refresh. */
  freshness(params: {
    userId: string;
    listKind: RankingListKind;
    maxAgeHours: number;
    formulaVersion: number;
  }): Promise<ListFreshness>;
  /** Fan-out: active users of a list, most recent first, paged by cursor (never OFFSET). */
  listActiveUsers(params: {
    listKind: RankingListKind;
    days: number;
    limit: number;
    after?: ActiveUsersCursor;
  }): Promise<ActiveUser[]>;
  purgeByUser(userId: string, manager?: TransactionManager): Promise<number>;
}
