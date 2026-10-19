import { Inject, Injectable } from '@nestjs/common';
import { Logger } from '@volontariapp/logger';
import { withDatabaseError } from '../helpers/database-error.helpers.js';
import type { IPurgeableRepository, PurgeReport } from '../repositories/index.js';
import {
  PostgresRankingEventFeedbackRepository,
  PostgresRankingEventMentionRepository,
  PostgresRankingEventWishRepository,
  PostgresRankingLikeLogRepository,
  PostgresRankingLocationRepository,
  PostgresRankingPostScoreRepository,
  PostgresRankingRateBucketRepository,
  PostgresRankingRequestRepository,
  PostgresRankingRunRepository,
  PostgresRankingScoreRepository,
} from '../repositories/index.js';

/**
 * Account deletion: removes every row of the user in one transaction. The mentions are keyed
 * by author. The lists of other users that contain the deleted user's items correct themselves
 * (the gateway only shows what ms-event and ms-post still return).
 */
@Injectable()
export class RankingPurgeService {
  private readonly logger = new Logger({ context: RankingPurgeService.name });
  private readonly tables: ReadonlyArray<readonly [string, IPurgeableRepository]>;

  constructor(
    @Inject(PostgresRankingRunRepository) private readonly runRepository: PostgresRankingRunRepository,
    @Inject(PostgresRankingScoreRepository) scoreRepository: IPurgeableRepository,
    @Inject(PostgresRankingPostScoreRepository) postScoreRepository: IPurgeableRepository,
    @Inject(PostgresRankingRequestRepository) requestRepository: IPurgeableRepository,
    @Inject(PostgresRankingLikeLogRepository) likeLogRepository: IPurgeableRepository,
    @Inject(PostgresRankingEventFeedbackRepository) feedbackRepository: IPurgeableRepository,
    @Inject(PostgresRankingEventWishRepository) wishRepository: IPurgeableRepository,
    @Inject(PostgresRankingEventMentionRepository) mentionRepository: IPurgeableRepository,
    @Inject(PostgresRankingLocationRepository) locationRepository: IPurgeableRepository,
    @Inject(PostgresRankingRateBucketRepository) bucketRepository: IPurgeableRepository,
  ) {
    this.tables = [
      ['ranking_score', scoreRepository],
      ['ranking_post_score', postScoreRepository],
      ['ranking_run', runRepository],
      ['ranking_request', requestRepository],
      ['ranking_like_log', likeLogRepository],
      ['ranking_event_feedback', feedbackRepository],
      ['ranking_event_wish', wishRepository],
      ['ranking_event_mention', mentionRepository],
      ['ranking_user_location', locationRepository],
      ['ranking_rate_bucket', bucketRepository],
    ];
  }

  /** One transaction: either every table is purged or none. Returns the rows removed per table. */
  purgeUser(userId: string): Promise<PurgeReport> {
    return withDatabaseError(this.logger, `purging the account ${userId}`, () =>
      this.runRepository.executeInTransaction(async (queryRunner) => {
        const report: PurgeReport = {};
        for (const [table, repository] of this.tables) {
          report[table] = await repository.purgeByUser(userId, queryRunner.manager);
        }
        return report;
      }),
    );
  }
}
