export enum RankingJobType {
  /** Computes the event list of one user. */
  COMPUTE_USER_RANKING = 'ranking.compute_user_ranking',
  /** Computes the post feed of one user. */
  COMPUTE_USER_FEED = 'ranking.compute_user_feed',
  FANOUT_RANKING = 'ranking.fanout',
}

export type RankingComputeReason =
  | 'USER_CREATED'
  | 'WISH_CHANGED'
  | 'EVENT_CREATED'
  | 'EVENT_FINISHED'
  | 'POST_PUBLISHED'
  | 'ON_DEMAND'
  | 'STALE_REFRESH'
  | 'MANUAL';

export interface IRankingComputePayload {
  userId: string;
  reason: RankingComputeReason;
  /** Text returned by the INSERT of ranking_request (clock of the database, microseconds). */
  requestedAt: string;
}

export interface IComputeUserRankingPayload extends IRankingComputePayload {}
export interface IComputeUserFeedPayload extends IRankingComputePayload {}

export interface IFanoutRankingPayload {
  trigger: 'EVENT_CREATED' | 'EVENT_FINISHED' | 'POST_CREATED';
  /** Event triggers. */
  eventId?: string;
  /** POST_CREATED. */
  postId?: string;
  /** POST_CREATED. */
  authorId?: string;
  requestedAt: string;
}
