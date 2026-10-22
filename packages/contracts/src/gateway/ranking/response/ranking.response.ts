import type {
  RequestRankingRefreshResponse,
  UpdateUserLocationResponse,
  RecordEventFeedbackResponse,
} from '../../../ranking/ranking.responses.js';
import type { EventDTO } from '../../event/response/event.response.js';
import type { PostWeb } from '../../post/response/post.response.js';

/** How a list was computed, as exposed by the gateway. */
export type RankingSourceWeb = 'FULL' | 'STRUCTURAL_ONLY' | 'COLD_START';

/** Explanation codes of a ranked item. The application maps them to texts. */
export type RankingReasonWeb =
  | 'FRIEND_INVOLVED'
  | 'NEAR_YOU'
  | 'MATCHES_INTERESTS'
  | 'STARTING_SOON'
  | 'TRENDING'
  | 'FOLLOWED_AUTHOR'
  | 'FRIEND_AUTHOR'
  | 'ENGAGED_AUTHOR'
  | 'LINKED_EVENT_WISHED'
  | 'LINKED_EVENT_JOINED'
  | 'RECENT';

/** Ranking data attached to each item of a ranked list. */
export interface RankingItemWeb {
  rankingScore: number;
  /** Two codes at most. */
  reasons: RankingReasonWeb[];
}

/** State of the list a page belongs to. */
export interface RankingMetaWeb {
  source: RankingSourceWeb;
  /** ISO 8601. */
  computedAt: string;
  /** A recomputation has been requested. */
  stale: boolean;
  /** Based on the rank in the list, not on the page length. */
  hasMore: boolean;
  /** The list was recomputed since the cursor was issued: the page restarts at rank 1. */
  versionChanged: boolean;
  listVersion: string;
  /** Opaque cursor of the next page, empty when hasMore is false. */
  nextCursor: string;
}

export interface RankedEventWeb extends EventDTO, RankingItemWeb {}

export interface RankedPostWeb extends PostWeb, RankingItemWeb {}

export interface GetRankingEventsWebResponse {
  events: RankedEventWeb[];
  totalCount: number;
  ranking: RankingMetaWeb;
}

export interface GetRankingFeedWebResponse {
  posts: RankedPostWeb[];
  totalCount: number;
  ranking: RankingMetaWeb;
}

/** refreshThrottled is true when the limit of 5 per minute is reached: HTTP 200, no recomputation. */
export interface RequestRankingRefreshWebResponse extends RequestRankingRefreshResponse {}

export interface UpdateUserLocationWebResponse extends UpdateUserLocationResponse {}

export interface RecordEventFeedbackWebResponse extends RecordEventFeedbackResponse {}
