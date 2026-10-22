import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from '@volontariapp/database';
import { BaseRepository } from '@volontariapp/database';
import type { TransactionManager } from './sql.js';
import { RankingRequestEntity } from '../entities/index.js';
import type { RankingListKind } from '../enums/index.js';
import { RankingRequestModel } from '../models/index.js';
import type {
  IRankingRequestRepository,
  RequestComputeParams,
  RequestComputeResult,
} from './interfaces/index.js';
import { completeRequestSql, markFollowUpSql } from './request-sql.js';
import type { Queryable } from './sql.js';
import { rowsOf } from './sql.js';

/**
 * Pending computation requests: they deduplicate the jobs, which jobs_outbox cannot do (its
 * status is COMPLETED as soon as the job is pushed). The comparison of dates stays in SQL, on
 * the clock of this database, because JavaScript truncates to the millisecond.
 */
@Injectable()
export class PostgresRankingRequestRepository
  extends BaseRepository<RankingRequestModel, RankingRequestEntity>
  implements IRankingRequestRepository
{
  constructor(
    @InjectRepository(RankingRequestModel)
    repository: Repository<RankingRequestModel>,
  ) {
    super(repository, RankingRequestEntity, RankingRequestModel);
  }

  async requestCompute(
    params: RequestComputeParams,
    executor: Queryable = this.repository.manager,
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

  completeRequest(
    params: { userId: string; listKind: RankingListKind; startedAt: string },
    executor: Queryable = this.repository.manager,
  ): Promise<string | null> {
    return completeRequestSql(executor, params);
  }

  markFollowUpJobEnqueued(
    params: { userId: string; listKind: RankingListKind },
    executor: Queryable = this.repository.manager,
  ): Promise<string | null> {
    return markFollowUpSql(executor, params);
  }

  async databaseClock(executor: Queryable = this.repository.manager): Promise<string> {
    const rows = rowsOf<{ now: string }>(await executor.query(`SELECT clock_timestamp()::text AS now`));
    const row = rows.at(0);
    if (!row) throw new Error('clock_timestamp() returned no row');
    return row.now;
  }

  async purgeByUser(
    userId: string,
    manager: TransactionManager = this.repository.manager,
  ): Promise<number> {
    const result = await manager.delete(RankingRequestModel, { userId });
    return result.affected ?? 0;
  }
}
