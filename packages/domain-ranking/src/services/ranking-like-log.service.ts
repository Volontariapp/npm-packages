import { Inject, Injectable } from '@nestjs/common';
import { Logger } from '@volontariapp/logger';
import type { LikeOrigin } from '../enums/index.js';
import { withDatabaseError } from '../helpers/database-error.helpers.js';
import type {
  ActiveLike,
  IRankingLikeLogRepository,
  Queryable,
  ReconcileResult,
} from '../repositories/index.js';
import { PostgresRankingLikeLogRepository } from '../repositories/index.js';

/** Journal of the likes with their date (the graph has none). Not encrypted: decision 30. */
@Injectable()
export class RankingLikeLogService {
  private readonly logger = new Logger({ context: RankingLikeLogService.name });

  constructor(
    @Inject(PostgresRankingLikeLogRepository)
    private readonly likeLogRepository: IRankingLikeLogRepository,
  ) {}

  recordLike(
    params: { userId: string; postId: string; occurredAt: Date; origin?: LikeOrigin },
    executor?: Queryable,
  ): Promise<void> {
    return withDatabaseError(this.logger, `recording a like of ${params.userId}`, () =>
      this.likeLogRepository.recordLike(params, executor),
    );
  }

  recordUnlike(
    params: { userId: string; postId: string; at: Date },
    executor?: Queryable,
  ): Promise<void> {
    return withDatabaseError(this.logger, `recording an unlike of ${params.userId}`, () =>
      this.likeLogRepository.recordUnlike(params, executor),
    );
  }

  listActive(userId: string, limit: number): Promise<ActiveLike[]> {
    return withDatabaseError(this.logger, `listing the likes of ${userId}`, () =>
      this.likeLogRepository.listActive(userId, limit),
    );
  }

  /** The graph is the truth for the existence of a like; the journal only brings the date. */
  reconcileWithGraph(params: {
    userId: string;
    graphPostIds: readonly string[];
    graphIsComplete: boolean;
    fallbackAt: Date;
  }): Promise<ReconcileResult> {
    return withDatabaseError(this.logger, `reconciling the likes of ${params.userId}`, () =>
      this.likeLogRepository.reconcileWithGraph(params),
    );
  }
}
