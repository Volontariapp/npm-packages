import type { Event, Tag, Requirement } from '../../../event/event.js';
import type { PaginationResponse } from '../../../common/pagination.js';

/**
 * REST-friendly Event DTO with Date objects
 */
export interface EventDTO extends Omit<Event, 'startAt' | 'endAt'> {
  startAt?: Date;
  endAt?: Date;
}

export interface EventWebResponse {
  event: EventDTO;
}

export interface ListEventsWebResponse {
  events: EventDTO[];
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
