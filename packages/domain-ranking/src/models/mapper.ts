import {
  databaseMapper,
  EventQueueEntity,
  EventQueueModel,
  JobsOutboxEntity,
  JobsOutboxModel,
} from '@volontariapp/database';
import {
  RankingEventFeedbackEntity,
  RankingEventMentionEntity,
  RankingEventWishEntity,
  RankingLikeLogEntity,
  RankingPostScoreEntity,
  RankingRateBucketEntity,
  RankingRequestEntity,
  RankingRunEntity,
  RankingScoreEntity,
  RankingUserLocationEntity,
} from '../entities/index.js';
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

/**
 * Registers the entity to model mappings used by the repositories. Idempotent. The outbox
 * mappings are required by the repositories of `@volontariapp/outbox`, which map through the
 * same `databaseMapper`, as in `domain-post`. Every entity shares its field names and types
 * with its model, so nothing needs overriding.
 */
export function registerRankingMappings(): void {
  databaseMapper.registerBidirectional(RankingScoreEntity, RankingScoreModel);
  databaseMapper.registerBidirectional(RankingPostScoreEntity, RankingPostScoreModel);
  databaseMapper.registerBidirectional(RankingRunEntity, RankingRunModel);
  databaseMapper.registerBidirectional(RankingRequestEntity, RankingRequestModel);
  databaseMapper.registerBidirectional(RankingLikeLogEntity, RankingLikeLogModel);
  databaseMapper.registerBidirectional(RankingEventFeedbackEntity, RankingEventFeedbackModel);
  databaseMapper.registerBidirectional(RankingEventWishEntity, RankingEventWishModel);
  databaseMapper.registerBidirectional(RankingEventMentionEntity, RankingEventMentionModel);
  databaseMapper.registerBidirectional(RankingUserLocationEntity, RankingUserLocationModel);
  databaseMapper.registerBidirectional(RankingRateBucketEntity, RankingRateBucketModel);
  databaseMapper.registerBidirectional(EventQueueEntity, EventQueueModel);
  databaseMapper.registerBidirectional(JobsOutboxEntity, JobsOutboxModel);
}
