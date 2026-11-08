import type { GetLeaderboardQuery } from '../../../user/user.query.js';

/** Period of a leaderboard in REST requests. */
export type LeaderboardScopeWeb = 'global' | 'week' | 'month';

/**
 * Public request to read the leaderboard.
 * `scope` defaults to `global`; `limit` is between 1 and 100 (default 20).
 */
export interface GetLeaderboardRequest extends Partial<Omit<GetLeaderboardQuery, 'scope'>> {
  scope?: LeaderboardScopeWeb;
}

/**
 * Public request to read the rank of the caller.
 * The user comes from the JWT.
 */
export interface GetMyRankRequest {
  scope?: LeaderboardScopeWeb;
}
