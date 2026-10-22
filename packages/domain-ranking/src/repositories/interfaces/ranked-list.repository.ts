import type { TransactionManager } from '../sql.js';
import type { RankingRunEntity } from '../../entities/index.js';
import type { RankingRunSource } from '../../enums/index.js';

export interface RunSummary {
  source: RankingRunSource;
  formulaVersion: number;
  /** Cause of the computation (RankingComputeReason). */
  reason: string;
  candidateCount: number;
  jevScoredCount: number;
  jevInputTokens?: number;
  jevOutputTokens?: number;
  durationMs: number;
  /** Truncated and masked by the caller. */
  lastError?: string;
}

export interface ReplaceListParams<TItem> {
  userId: string;
  /** `started_at` of the computation: text from the clock of the database. */
  startedAt: string;
  items: readonly TItem[];
  run: RunSummary;
}

export interface ReplaceListResult {
  /** false when a list computed from a more recent state already exists: nothing was written. */
  written: boolean;
  listVersion?: string;
  /** A request arrived during the computation: the caller must write a follow-up job. */
  followUpRequired: boolean;
  /** `requestedAt` of the follow-up job, when followUpRequired. */
  followUpRequestedAt?: string;
}

/** Runs inside the transaction of the write, after the request was handled. */
export type AfterListWrite = (manager: TransactionManager, result: ReplaceListResult) => Promise<void>;

export interface ListPage<TEntity> {
  run: RankingRunEntity | null;
  /** Rows after the cursor, ordered by rank: ask for limit + 1 to know hasMore. */
  items: TEntity[];
}

export interface PageParams {
  userId: string;
  afterRank: number;
  limit: number;
}
