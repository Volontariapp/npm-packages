import type { Event, Tag, Requirement } from '../../../event/event.js';
import type { PaginationResponse } from '../../../common/pagination.js';

/** Processing state of the cover photo of an event, as exposed by the gateway. */
export type CoverStatusWeb = 'NONE' | 'PENDING' | 'READY' | 'REJECTED';

/**
 * REST-friendly Event DTO with Date objects
 */
export interface EventDTO extends Omit<Event, 'startAt' | 'endAt' | 'coverStatus'> {
  startAt?: Date;
  endAt?: Date;
  /** Name of the status (the gRPC client delivers enums by name); absent means NONE. */
  coverStatus?: CoverStatusWeb;
  /** Public URL computed by the gateway from coverFileId. Absent until coverStatus is READY. */
  coverUrl?: string;
}

export interface EventWebResponse {
  event: EventDTO;
}

export interface ListEventsWebResponse {
  events: EventDTO[];
  totalCount: number;
  pagination: PaginationResponse;
}

export interface GetEventsByIdsWebResponse {
  events: EventDTO[];
  totalCount: number;
}

export interface GetUserCreatedEventsWebResponse {
  events: EventDTO[];
  totalCount: number;
}

export interface GetUserParticipatedEventsWebResponse {
  events: EventDTO[];
  totalCount: number;
}

export interface GetUserWishedEventsWebResponse {
  events: EventDTO[];
  totalCount: number;
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

export interface EventIdWebResponse {
  id: string;
}

export interface IdsListWebResponse {
  ids: string[];
}

export interface ExistsWebResponse {
  exists: boolean;
}
