import { Inject, Injectable } from '@nestjs/common';
import type { TransactionManager } from '../repositories/sql.js';
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

/** Rows removed per table by the purge of an account. */
export type PurgeReport = Record<string, number>;

interface Purgeable {
  purgeByUser(userId: string, manager?: TransactionManager): Promise<number>;
}

/**
 * Account deletion: removes every row of the user in one transaction. The mentions are keyed
 * by author. The lists of other users that contain the deleted user's items correct themselves
 * (the gateway only shows what ms-event and ms-post still return).
 */
@Injectable()
export class RankingPurgeService {
  private readonly tables: ReadonlyArray<readonly [string, Purgeable]>;

  constructor(
    @Inject(PostgresRankingRunRepository) private readonly runs: PostgresRankingRunRepository,
    @Inject(PostgresRankingScoreRepository) scores: PostgresRankingScoreRepository,
    @Inject(PostgresRankingPostScoreRepository) postScores: PostgresRankingPostScoreRepository,
    @Inject(PostgresRankingRequestRepository) requests: PostgresRankingRequestRepository,
    @Inject(PostgresRankingLikeLogRepository) likeLog: PostgresRankingLikeLogRepository,
    @Inject(PostgresRankingEventFeedbackRepository) feedback: PostgresRankingEventFeedbackRepository,
    @Inject(PostgresRankingEventWishRepository) wishes: PostgresRankingEventWishRepository,
    @Inject(PostgresRankingEventMentionRepository) mentions: PostgresRankingEventMentionRepository,
    @Inject(PostgresRankingLocationRepository) locations: PostgresRankingLocationRepository,
    @Inject(PostgresRankingRateBucketRepository) buckets: PostgresRankingRateBucketRepository,
  ) {
    this.tables = [
      ['ranking_score', scores],
      ['ranking_post_score', postScores],
      ['ranking_run', runs],
      ['ranking_request', requests],
      ['ranking_like_log', likeLog],
      ['ranking_event_feedback', feedback],
      ['ranking_event_wish', wishes],
      ['ranking_event_mention', mentions],
      ['ranking_user_location', locations],
      ['ranking_rate_bucket', buckets],
    ];
  }

  purgeUser(userId: string): Promise<PurgeReport> {
    return this.runs.executeInTransaction(async (queryRunner) => {
      const report: PurgeReport = {};
      for (const [table, repository] of this.tables) {
        report[table] = await repository.purgeByUser(userId, queryRunner.manager);
      }
      return report;
    });
  }
}
