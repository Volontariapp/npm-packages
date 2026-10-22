/** The two ranked lists of a user. */
export const RankingListKind = {
  EVENT: 'EVENT',
  POST: 'POST',
} as const;
export type RankingListKind = (typeof RankingListKind)[keyof typeof RankingListKind];

/** How a list was computed. COLD_START: a feed without any personal candidate. */
export const RankingRunSource = {
  FULL: 'FULL',
  STRUCTURAL_ONLY: 'STRUCTURAL_ONLY',
  COLD_START: 'COLD_START',
} as const;
export type RankingRunSource = (typeof RankingRunSource)[keyof typeof RankingRunSource];

export const EventRankingReason = {
  FRIEND_INVOLVED: 'FRIEND_INVOLVED',
  NEAR_YOU: 'NEAR_YOU',
  MATCHES_INTERESTS: 'MATCHES_INTERESTS',
  STARTING_SOON: 'STARTING_SOON',
  TRENDING: 'TRENDING',
} as const;
export type EventRankingReason = (typeof EventRankingReason)[keyof typeof EventRankingReason];

export const PostRankingReason = {
  FOLLOWED_AUTHOR: 'FOLLOWED_AUTHOR',
  FRIEND_AUTHOR: 'FRIEND_AUTHOR',
  ENGAGED_AUTHOR: 'ENGAGED_AUTHOR',
  LINKED_EVENT_WISHED: 'LINKED_EVENT_WISHED',
  LINKED_EVENT_JOINED: 'LINKED_EVENT_JOINED',
  RECENT: 'RECENT',
} as const;
export type PostRankingReason = (typeof PostRankingReason)[keyof typeof PostRankingReason];

export type RankingReason = EventRankingReason | PostRankingReason;

/** Where a candidate post comes from. */
export const PostOrigin = {
  FOLLOWED: 'FOLLOWED',
  ENGAGED: 'ENGAGED',
  EVENT: 'EVENT',
  GLOBAL: 'GLOBAL',
} as const;
export type PostOrigin = (typeof PostOrigin)[keyof typeof PostOrigin];

export const FeedbackAction = {
  PASS: 'PASS',
} as const;
export type FeedbackAction = (typeof FeedbackAction)[keyof typeof FeedbackAction];

export const RateBucketName = {
  REFRESH: 'REFRESH',
  LOCATION: 'LOCATION',
} as const;
export type RateBucketName = (typeof RateBucketName)[keyof typeof RateBucketName];

export const LikeOrigin = {
  STREAM: 'STREAM',
  BACKFILL: 'BACKFILL',
} as const;
export type LikeOrigin = (typeof LikeOrigin)[keyof typeof LikeOrigin];

export type EventType = 'SOCIAL' | 'ECOLOGY';
