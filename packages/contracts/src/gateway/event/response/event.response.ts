import type { Event, Tag, Requirement } from '../../../event/event.js';
import type { PaginationResponse } from '../../../common/pagination.js';

export interface EventWebResponse {
  event: Event;
}

export interface ListEventsWebResponse {
  events: Event[];
  totalCount: number;
  pagination: PaginationResponse;
}

export interface TagWebResponse {
  tag: Tag;
}

export interface ListTagsWebResponse {
  tags: Tag[];
}

export interface ListRequirementsWebResponse {
  requirements: Requirement[];
}

export interface ActionSuccessWebResponse {
  success: boolean;
  message?: string;
}
