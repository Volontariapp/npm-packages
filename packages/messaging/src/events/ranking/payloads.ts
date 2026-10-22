import type { IUserIdPayload } from '../index.js';

export enum RankingEventMessagingType {
  USER_RANKING_DELETED = 'user_ranking.deleted',
  USER_RANKING_DELETION_FAILED = 'user_ranking.deletion_failed',
}

export interface IUserRankingDeletedPayload extends IUserIdPayload {}
export interface IUserRankingDeletionFailedPayload extends IUserIdPayload {
  errorReason?: string;
}
