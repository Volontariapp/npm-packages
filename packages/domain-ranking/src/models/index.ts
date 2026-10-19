import { RankingEventFeedbackModel } from './ranking-event-feedback.model.js';
import { RankingEventMentionModel } from './ranking-event-mention.model.js';
import { RankingEventWishModel } from './ranking-event-wish.model.js';
import { RankingLikeLogModel } from './ranking-like-log.model.js';
import { RankingPostScoreModel } from './ranking-post-score.model.js';
import { RankingRateBucketModel } from './ranking-rate-bucket.model.js';
import { RankingRequestModel } from './ranking-request.model.js';
import { RankingRunModel } from './ranking-run.model.js';
import { RankingScoreModel } from './ranking-score.model.js';
import { RankingUserLocationModel } from './ranking-user-location.model.js';

export * from './ranking-score.model.js';
export * from './ranking-post-score.model.js';
export * from './ranking-run.model.js';
export * from './ranking-request.model.js';
export * from './ranking-like-log.model.js';
export * from './ranking-event-feedback.model.js';
export * from './ranking-event-wish.model.js';
export * from './ranking-event-mention.model.js';
export * from './ranking-user-location.model.js';
export * from './ranking-rate-bucket.model.js';

/** Every table of the ranking domain (the standard outbox tables come from @volontariapp/database). */
export const RANKING_MODELS = [
  RankingScoreModel,
  RankingPostScoreModel,
  RankingRunModel,
  RankingRequestModel,
  RankingLikeLogModel,
  RankingEventFeedbackModel,
  RankingEventWishModel,
  RankingEventMentionModel,
  RankingUserLocationModel,
  RankingRateBucketModel,
];
