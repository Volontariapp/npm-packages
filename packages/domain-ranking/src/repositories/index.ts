import type { DataSource } from 'typeorm';
import { RankingLikeLogRepository } from './ranking-like-log.repository.js';
import { RankingListRepository } from './ranking-list.repository.js';
import { RankingLocationRepository } from './ranking-location.repository.js';
import { RankingPurgeRepository } from './ranking-purge.repository.js';
import { RankingRateBucketRepository } from './ranking-rate-bucket.repository.js';
import { RankingRequestRepository } from './ranking-request.repository.js';
import { RankingRunRepository } from './ranking-run.repository.js';
import {
  EventFeedbackRepository,
  EventMentionRepository,
  EventWishRepository,
} from './ranking-signals.repository.js';

export * from './sql.js';
export * from './ranking-request.repository.js';
export * from './ranking-run.repository.js';
export * from './ranking-list.repository.js';
export * from './ranking-rate-bucket.repository.js';
export * from './ranking-signals.repository.js';
export * from './ranking-like-log.repository.js';
export * from './ranking-location.repository.js';
export * from './ranking-purge.repository.js';

export interface RankingRepositories {
  requests: RankingRequestRepository;
  runs: RankingRunRepository;
  lists: RankingListRepository;
  rateBuckets: RankingRateBucketRepository;
  feedback: EventFeedbackRepository;
  wishes: EventWishRepository;
  mentions: EventMentionRepository;
  likeLog: RankingLikeLogRepository;
  locations: RankingLocationRepository;
  purge: RankingPurgeRepository;
}

/** Builds every repository of the domain on one data source (a service, a worker or a post-processor). */
export const createRankingRepositories = (dataSource: DataSource): RankingRepositories => ({
  requests: new RankingRequestRepository(dataSource),
  runs: new RankingRunRepository(dataSource),
  lists: new RankingListRepository(dataSource),
  rateBuckets: new RankingRateBucketRepository(dataSource),
  feedback: new EventFeedbackRepository(dataSource),
  wishes: new EventWishRepository(dataSource),
  mentions: new EventMentionRepository(dataSource),
  likeLog: new RankingLikeLogRepository(dataSource),
  locations: new RankingLocationRepository(dataSource),
  purge: new RankingPurgeRepository(dataSource),
});
