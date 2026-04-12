import type { SearchEventsQuery } from '../../../event/event.query.js';

/**
 * Public request to search events.
 */
export interface SearchEventsRequest extends Partial<SearchEventsQuery> {}
