import { Inject, Injectable } from '@nestjs/common';
import { Logger } from '@volontariapp/logger';
import type { RankingListKind } from '../enums/index.js';
import { withDatabaseError } from '../helpers/database-error.helpers.js';
import type {
  IRankingRequestRepository,
  Queryable,
  RequestComputeParams,
  RequestComputeResult,
} from '../repositories/index.js';
import { PostgresRankingRequestRepository } from '../repositories/index.js';

/** Computation requests: they deduplicate the jobs and decide whether a job must be written. */
@Injectable()
export class RankingRequestService {
  private readonly logger = new Logger({ context: RankingRequestService.name });

  constructor(
    @Inject(PostgresRankingRequestRepository)
    private readonly requestRepository: IRankingRequestRepository,
  ) {}

  /** Call it in the transaction that writes the job (pass its manager as `executor`). */
  requestCompute(params: RequestComputeParams, executor?: Queryable): Promise<RequestComputeResult> {
    return withDatabaseError(this.logger, `requesting a ${params.listKind} computation`, () =>
      this.requestRepository.requestCompute(params, executor),
    );
  }

  completeRequest(
    params: { userId: string; listKind: RankingListKind; startedAt: string },
    executor?: Queryable,
  ): Promise<string | null> {
    return withDatabaseError(this.logger, 'completing a computation request', () =>
      this.requestRepository.completeRequest(params, executor),
    );
  }

  markFollowUpJobEnqueued(
    params: { userId: string; listKind: RankingListKind },
    executor?: Queryable,
  ): Promise<string | null> {
    return withDatabaseError(this.logger, 'marking a follow-up job', () =>
      this.requestRepository.markFollowUpJobEnqueued(params, executor),
    );
  }

  /** `startedAt` of a computation: the clock of the database, never Date.now(). */
  databaseClock(executor?: Queryable): Promise<string> {
    return withDatabaseError(this.logger, 'reading the database clock', () =>
      this.requestRepository.databaseClock(executor),
    );
  }
}
