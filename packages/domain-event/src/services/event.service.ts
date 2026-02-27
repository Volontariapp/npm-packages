import type {
  GetEventRequest,
  GetEventResponse,
  ListEventsRequest,
  ListEventsResponse,
  CreateEventRequest,
  CreateEventResponse,
  UpdateEventRequest,
  UpdateEventResponse,
  DeleteEventRequest,
  DeleteEventResponse,
} from '../contracts';

export interface IEventService {
  getEvent(request: GetEventRequest): Promise<GetEventResponse>;
  listEvents(request: ListEventsRequest): Promise<ListEventsResponse>;
  createEvent(request: CreateEventRequest): Promise<CreateEventResponse>;
  updateEvent(request: UpdateEventRequest): Promise<UpdateEventResponse>;
  deleteEvent(request: DeleteEventRequest): Promise<DeleteEventResponse>;
}
