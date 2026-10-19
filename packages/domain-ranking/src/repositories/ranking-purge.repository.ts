import type { DataSource } from 'typeorm';
import {
  RankingEventFeedbackModel,
  RankingEventMentionModel,
  RankingEventWishModel,
  RankingLikeLogModel,
  RankingPostScoreModel,
  RankingRateBucketModel,
  RankingRequestModel,
  RankingRunModel,
  RankingScoreModel,
  RankingUserLocationModel,
} from '../models/index.js';

/** Rows removed per table by the purge of an account. */
export type PurgeReport = Record<string, number>;

/**
 * Account deletion: removes every row of the user in one transaction. The mentions are keyed
 * by author. The lists of other users that contain the deleted user's items correct themselves
 * (the gateway only shows what ms-event and ms-post still return).
 */
export class RankingPurgeRepository {
  constructor(private readonly dataSource: DataSource) {}

  purgeUser(userId: string): Promise<PurgeReport> {
    return this.dataSource.transaction(async (manager) => {
      const report: PurgeReport = {};
      const byUser: Array<[string, new () => object]> = [
        ['ranking_score', RankingScoreModel],
        ['ranking_post_score', RankingPostScoreModel],
        ['ranking_run', RankingRunModel],
        ['ranking_request', RankingRequestModel],
        ['ranking_like_log', RankingLikeLogModel],
        ['ranking_event_feedback', RankingEventFeedbackModel],
        ['ranking_event_wish', RankingEventWishModel],
        ['ranking_user_location', RankingUserLocationModel],
        ['ranking_rate_bucket', RankingRateBucketModel],
      ];
      for (const [table, model] of byUser) {
        const result = await manager.delete(model, { userId });
        report[table] = result.affected ?? 0;
      }
      const mentions = await manager.delete(RankingEventMentionModel, { authorId: userId });
      report['ranking_event_mention'] = mentions.affected ?? 0;
      return report;
    });
  }
}
