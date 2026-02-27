export interface PaginationRequest {
  page?: number;
  limit?: number;
}

export interface PaginationResponse {
  totalItems: number;
  totalPages: number;
  currentPage: number;
  limit: number;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  location: string;
  organizerId: string;
}

export interface GetEventRequest {
  id: string;
}

export interface GetEventResponse {
  event: Event;
}

export interface ListEventsRequest {
  pagination?: PaginationRequest;
}

export interface ListEventsResponse {
  events: Event[];
  pagination?: PaginationResponse;
}

export interface CreateEventRequest {
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  location: string;
  organizerId: string;
}

export interface CreateEventResponse {
  event: Event;
}

export interface UpdateEventRequest {
  id: string;
  title?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  location?: string;
}

export interface UpdateEventResponse {
  event: Event;
}

export interface DeleteEventRequest {
  id: string;
}

export interface DeleteEventResponse {
  success: boolean;
}
