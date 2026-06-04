import type {
  CreateEventCommand,
  UpdateEventCommand,
  ChangeEventStateCommand,
  ManageRequirementCommand,
  DeleteEventCommand,
  CreateTagCommand,
  UpdateTagCommand,
  DeleteTagCommand,
  GetUserEventQuery,
  GetUserParticipateEventQuery,
  GetUserWishEventQuery,
} from '@volontariapp/contracts';

export enum EventsJobType {
  PUBLISH_EVENT = 'events.publish_event',
  FALLBACK_GET_USER_CREATED_EVENTS = 'events.fallback_get_user_created_events',
  FALLBACK_GET_USER_PARTICIPATED_EVENTS = 'events.fallback_get_user_participated_events',
  FALLBACK_GET_USER_WISHED_EVENTS = 'events.fallback_get_user_wished_events',
  FALLBACK_CREATE_EVENT = 'events.fallback_create_event',
  FALLBACK_UPDATE_EVENT = 'events.fallback_update_event',
  FALLBACK_CHANGE_EVENT_STATE = 'events.fallback_change_event_state',
  FALLBACK_MANAGE_REQUIREMENTS = 'events.fallback_manage_requirements',
  FALLBACK_DELETE_EVENT = 'events.fallback_delete_event',
  FALLBACK_CREATE_TAG = 'events.fallback_create_tag',
  FALLBACK_UPDATE_TAG = 'events.fallback_update_tag',
  FALLBACK_DELETE_TAG = 'events.fallback_delete_tag',
  GEOCODE_EVENT = 'events.geocode_event',
}

export interface IPublishEventPayload {
  eventId: string;
  creatorId: string;
}

export interface IGeocodeEventPayload {
  eventId: string;
  localisationName: string;
}

export interface IEventFallbackJobPayload<T> {
  userId: string;
  payload: T;
}

export interface IFallbackGetUserCreatedEventsJobPayload
  extends IEventFallbackJobPayload<GetUserEventQuery> {}
export interface IFallbackGetUserParticipatedEventsJobPayload
  extends IEventFallbackJobPayload<GetUserParticipateEventQuery> {}
export interface IFallbackGetUserWishedEventsJobPayload
  extends IEventFallbackJobPayload<GetUserWishEventQuery> {}
export interface IFallbackCreateEventJobPayload
  extends IEventFallbackJobPayload<CreateEventCommand> {}
export interface IFallbackUpdateEventJobPayload
  extends IEventFallbackJobPayload<UpdateEventCommand> {}
export interface IFallbackChangeEventStateJobPayload
  extends IEventFallbackJobPayload<ChangeEventStateCommand> {}
export interface IFallbackManageRequirementsJobPayload
  extends IEventFallbackJobPayload<ManageRequirementCommand> {}
export interface IFallbackDeleteEventJobPayload
  extends IEventFallbackJobPayload<DeleteEventCommand> {}
export interface IFallbackCreateTagJobPayload extends IEventFallbackJobPayload<CreateTagCommand> {}
export interface IFallbackUpdateTagJobPayload extends IEventFallbackJobPayload<UpdateTagCommand> {}
export interface IFallbackDeleteTagJobPayload extends IEventFallbackJobPayload<DeleteTagCommand> {}
