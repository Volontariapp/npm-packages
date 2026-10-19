import type { DataSource } from 'typeorm';
import type { RankingListKind } from '../enums/index.js';
import type { Queryable } from './sql.js';
import { rowsOf } from './sql.js';

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

/**
 * Pending computation requests: they deduplicate the jobs, which jobs_outbox cannot do (its
 * status is COMPLETED as soon as the job is pushed). The comparison of dates stays in SQL, on
 * the clock of this database, because JavaScript truncates to the millisecond.
 */
export class RankingRequestRepository {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * Registers a request. Call it in the same transaction as the write of the job (pass the
   * manager of that transaction).
   */
  async requestCompute(
    params: RequestComputeParams,
    executor: Queryable = this.dataSource.manager,
  ): Promise<RequestComputeResult> {
    const rows = rowsOf<{ requested_at: string; needs_job: boolean }>(
      await executor.query(
        `WITH t AS (SELECT clock_timestamp() AS ts)
         INSERT INTO ranking_request AS r (user_id, list_kind, requested_at, reason, job_enqueued_at)
         SELECT $1::uuid, $4::varchar, t.ts, $2::varchar, t.ts FROM t
         ON CONFLICT (user_id, list_kind) DO UPDATE
           SET requested_at = EXCLUDED.requested_at,
               reason = EXCLUDED.reason,
               job_enqueued_at = CASE
                 WHEN $5::boolean
                   OR r.job_enqueued_at <= EXCLUDED.requested_at - make_interval(secs => $3::double precision)
                 THEN EXCLUDED.requested_at
                 ELSE r.job_enqueued_at
               END
         RETURNING requested_at::text AS requested_at, (job_enqueued_at = requested_at) AS needs_job`,
        [params.userId, params.reason, params.ttlSeconds, params.listKind, params.force],
      ),
    );
    const row = rows.at(0);
    if (!row) throw new Error('ranking_request upsert returned no row');
    return { requestedAt: row.requested_at, needsJob: row.needs_job };
  }

  /**
   * Deletes the request unless a more recent one arrived during the computation (requested_at
   * after `startedAt`). Returns the surviving `requestedAt`, or null when nothing survives.
   */
  async completeRequest(
    params: { userId: string; listKind: RankingListKind; startedAt: string },
    executor: Queryable = this.dataSource.manager,
  ): Promise<string | null> {
    await executor.query(
      `DELETE FROM ranking_request
       WHERE user_id = $1::uuid AND list_kind = $2::varchar AND requested_at <= $3::timestamptz`,
      [params.userId, params.listKind, params.startedAt],
    );
    const rows = rowsOf<{ requested_at: string }>(
      await executor.query(
        `SELECT requested_at::text AS requested_at FROM ranking_request
         WHERE user_id = $1::uuid AND list_kind = $2::varchar`,
        [params.userId, params.listKind],
      ),
    );
    return rows.at(0)?.requested_at ?? null;
  }

  /**
   * Records that a follow-up job was written for the surviving request (same transaction as the
   * write of the list). Returns the `requestedAt` to put in the job, or null if the request is gone.
   */
  async markFollowUpJobEnqueued(
    params: { userId: string; listKind: RankingListKind },
    executor: Queryable = this.dataSource.manager,
  ): Promise<string | null> {
    const rows = rowsOf<{ requested_at: string }>(
      await executor.query(
        `UPDATE ranking_request SET job_enqueued_at = clock_timestamp()
         WHERE user_id = $1::uuid AND list_kind = $2::varchar
         RETURNING requested_at::text AS requested_at`,
        [params.userId, params.listKind],
      ),
    );
    return rows.at(0)?.requested_at ?? null;
  }

  /** Clock of the database, as text: the `startedAt` of a computation. Never use Date.now(). */
  async databaseClock(executor: Queryable = this.dataSource.manager): Promise<string> {
    const rows = rowsOf<{ now: string }>(await executor.query(`SELECT clock_timestamp()::text AS now`));
    const row = rows.at(0);
    if (!row) throw new Error('clock_timestamp() returned no row');
    return row.now;
  }
}
