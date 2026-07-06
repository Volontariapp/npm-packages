import type { EventType, EventState } from '../../../event/event.js';

export interface SearchEventsWebQuery {
  // Filtres de Domaine (ms-event)
  searchTerm?: string;
  types?: EventType[];
  tagSlugs?: string[];
  onlyAvailable?: boolean;
  area?: {
    center: { latitude: number; longitude: number };
    radiusMeters: number;
  };
  startDateFrom?: string; // ISO 8601
  startDateTo?: string; // ISO 8601
  statuses?: EventState[];
  // Filtres Sociaux (ms-social)
  excludeCreatedByMe?: boolean;
  excludeBlockedUsers?: boolean;
  excludeParticipatedByMe?: boolean;
  excludeWishedByMe?: boolean;
  onlyParticipatedByFriends?: boolean;
  onlyWishedByFriends?: boolean;
  onlyCreatedByFriends?: boolean;
  // Pagination
  page: number;
  limit: number;
}

/**
 * Public request to search events.
 */
export interface SearchEventsRequest extends SearchEventsWebQuery {}
