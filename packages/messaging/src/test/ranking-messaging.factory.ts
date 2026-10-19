import type {
  IComputeUserFeedPayload,
  IComputeUserRankingPayload,
  IFanoutRankingPayload,
} from '../jobs/index.js';

export const buildComputeUserRankingPayload = (
  overrides: Partial<IComputeUserRankingPayload> = {},
): IComputeUserRankingPayload => ({
  userId: 'user-1',
  reason: 'ON_DEMAND',
  requestedAt: '2026-10-19 10:00:00.123456',
  ...overrides,
});

export const buildComputeUserFeedPayload = (
  overrides: Partial<IComputeUserFeedPayload> = {},
): IComputeUserFeedPayload => ({
  userId: 'user-1',
  reason: 'POST_PUBLISHED',
  requestedAt: '2026-10-19 10:00:00.123456',
  ...overrides,
});

export const buildFanoutRankingPayload = (
  overrides: Partial<IFanoutRankingPayload> = {},
): IFanoutRankingPayload => ({
  trigger: 'EVENT_CREATED',
  eventId: 'event-1',
  requestedAt: '2026-10-19 10:00:00.123456',
  ...overrides,
});
