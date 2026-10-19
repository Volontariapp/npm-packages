import type {
  UpdateUserLocationCommand,
  EventFeedbackItem,
} from '../../../ranking/ranking.command.js';
import type { GetRankingEventsQuery, GetRankingFeedQuery } from '../../../ranking/ranking.query.js';

/** List a ranking request applies to, as exposed by the gateway. */
export type RankingListKindWeb = 'EVENT' | 'POST';

/** User gesture recorded on an event, as exposed by the gateway. */
export type FeedbackActionWeb = 'PASS';

/**
 * Query of GET /ranking/events. The cursor is opaque: it is the nextCursor of the previous page.
 * Both fields are optional: the first page has no cursor.
 */
export interface GetRankingEventsWebRequest extends Partial<GetRankingEventsQuery> {}

/** Query of GET /ranking/feed. Same rules as GetRankingEventsWebRequest. */
export interface GetRankingFeedWebRequest extends Partial<GetRankingFeedQuery> {}

/** Body of POST /ranking/refresh. */
export interface RequestRankingRefreshWebRequest {
  listKind: RankingListKindWeb;
}

/**
 * Body of PUT /ranking/location. The server rounds the position to 1 km;
 * the application sends the raw position.
 */
export interface UpdateUserLocationWebRequest extends UpdateUserLocationCommand {}

export interface EventFeedbackWebItem extends Omit<EventFeedbackItem, 'action'> {
  action: FeedbackActionWeb;
}

/** Body of POST /ranking/events/feedback: 50 items at most. */
export interface RecordEventFeedbackWebRequest {
  items: EventFeedbackWebItem[];
}
