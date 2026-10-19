import type { TransactionManager } from '../sql.js';
import type { RankingListKind } from '../../enums/index.js';
import type { Queryable } from '../sql.js';

export interface RequestComputeParams {
  userId: string;
  listKind: RankingListKind;
  /** Cause of the request (RankingComputeReason). */
  reason: string;
  /** true for ON_DEMAND and MANUAL: a job is always required. */
  force: boolean;
  /** RANKING_REQUEST_TTL_SECONDS: past this delay a job is considered lost. */
  ttlSeconds: number;
}

export interface RequestComputeResult {
  /** Text returned by the database (microseconds kept): becomes `requestedAt` of the job. */
  requestedAt: string;
  /** true when a job must be written (first request, forced request, or lost job). */
  needsJob: boolean;
}

export interface IRankingRequestRepository {
  /** Call it in the same transaction as the write of the job (pass the manager of that transaction). */
  requestCompute(params: RequestComputeParams, executor?: Queryable): Promise<RequestComputeResult>;
  /** Returns the surviving `requestedAt`, or null when no more recent request arrived. */
  completeRequest(
    params: { userId: string; listKind: RankingListKind; startedAt: string },
    executor?: Queryable,
  ): Promise<string | null>;
  /** Returns the `requestedAt` to put in the follow-up job, or null if the request is gone. */
  markFollowUpJobEnqueued(
    params: { userId: string; listKind: RankingListKind },
    executor?: Queryable,
  ): Promise<string | null>;
  /** Clock of the database, as text: the `startedAt` of a computation. Never use Date.now(). */
  databaseClock(executor?: Queryable): Promise<string>;
  purgeByUser(userId: string, manager?: TransactionManager): Promise<number>;
}
