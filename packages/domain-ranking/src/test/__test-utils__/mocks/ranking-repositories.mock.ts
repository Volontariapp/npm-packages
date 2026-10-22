import { createMock } from '@volontariapp/testing';
import type { jest } from '@jest/globals';
import type {
  IRankingEventFeedbackRepository,
  IRankingEventMentionRepository,
  IRankingEventWishRepository,
  IRankingLikeLogRepository,
  IRankingLocationRepository,
  IRankingPostScoreRepository,
  IRankingRateBucketRepository,
  IRankingRequestRepository,
  IRankingRunRepository,
  IRankingScoreRepository,
} from '../../../repositories/index.js';

export const createRequestRepositoryMock = (): jest.Mocked<IRankingRequestRepository> =>
  createMock<IRankingRequestRepository>();
export const createRunRepositoryMock = (): jest.Mocked<IRankingRunRepository> =>
  createMock<IRankingRunRepository>();
export const createScoreRepositoryMock = (): jest.Mocked<IRankingScoreRepository> =>
  createMock<IRankingScoreRepository>();
export const createPostScoreRepositoryMock = (): jest.Mocked<IRankingPostScoreRepository> =>
  createMock<IRankingPostScoreRepository>();
export const createRateBucketRepositoryMock = (): jest.Mocked<IRankingRateBucketRepository> =>
  createMock<IRankingRateBucketRepository>();
export const createFeedbackRepositoryMock = (): jest.Mocked<IRankingEventFeedbackRepository> =>
  createMock<IRankingEventFeedbackRepository>();
export const createWishRepositoryMock = (): jest.Mocked<IRankingEventWishRepository> =>
  createMock<IRankingEventWishRepository>();
export const createMentionRepositoryMock = (): jest.Mocked<IRankingEventMentionRepository> =>
  createMock<IRankingEventMentionRepository>();
export const createLikeLogRepositoryMock = (): jest.Mocked<IRankingLikeLogRepository> =>
  createMock<IRankingLikeLogRepository>();
export const createLocationRepositoryMock = (): jest.Mocked<IRankingLocationRepository> =>
  createMock<IRankingLocationRepository>();
