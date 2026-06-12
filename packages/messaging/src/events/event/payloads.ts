import type { IEventIdPayload, IUserIdPayload } from '../index.js';

export enum EventEventMessagingType {
  EVENT_CREATED = 'event.created',
  EVENT_DELETED = 'event.deleted',

  EVENT_GEOCODED = 'event.geocoded',
  EVENT_GEOCODING_FAILED = 'event.geocoding_failed',

  EVENT_CREATION_SUCCESSFULL = 'event.creation_successfull', // WS -> [EVENT] -> SAGA DONE
  EVENT_CREATION_FAILED = 'event.creation_failed', // WS -> [EVENT, SOCIAL] -> SAGA FAILED
  EVENT_DELETION_SUCCESSFULL = 'event.deletion_successfull', // WS -> [EVENT] -> DELETE EVENT
  EVENT_DELETION_FAILED = 'event.deletion_failed', // WS -> TODO: Reflechir

  // --- FALLBACK EVENTS ---
  FALLBACK_CREATE_EVENT = 'fallback.create.event',
  FALLBACK_UPDATE_EVENT = 'fallback.update.event',
  FALLBACK_DELETE_EVENT = 'fallback.delete.event',
  FALLBACK_CHANGE_EVENT_STATE = 'fallback.change_event_state.event',
  FALLBACK_MANAGE_REQUIREMENTS = 'fallback.manage_requirements.event',
  FALLBACK_CREATE_TAG = 'fallback.create.tag',
  FALLBACK_UPDATE_TAG = 'fallback.update.tag',
  FALLBACK_DELETE_TAG = 'fallback.delete.tag',
}

export interface IEventCreatedPayload extends IEventIdPayload, Partial<IUserIdPayload> {
  localisationName: string;
}
export interface IEventDeletedPayload extends IEventIdPayload, Partial<IUserIdPayload> {}

export interface IEventGeocodedPayload extends IEventIdPayload, Partial<IUserIdPayload> {}

export interface IEventGeocodingFailedPayload extends IEventIdPayload, Partial<IUserIdPayload> {}

export interface IEventCreationSuccessfullPayload
  extends IEventIdPayload,
    Partial<IUserIdPayload> {}

export interface IEventCreationFailedPayload extends IEventIdPayload, Partial<IUserIdPayload> {}

export interface IEventDeletionSuccessfullPayload
  extends IEventIdPayload,
    Partial<IUserIdPayload> {}

export interface IEventDeletionFailedPayload extends IEventIdPayload, Partial<IUserIdPayload> {}

// FALLBACK INTERFACE
export interface IFallbackCreateEventPayload extends IEventIdPayload, Partial<IUserIdPayload> {}

export interface IFallbackUpdateEventPayload extends IEventIdPayload, Partial<IUserIdPayload> {}

export interface IFallbackDeleteEventPayload extends IEventIdPayload, Partial<IUserIdPayload> {}

export interface IFallbackChangeEventStatePayload
  extends IEventIdPayload,
    Partial<IUserIdPayload> {}

export interface IFallbackManageRequirementsPayload
  extends IEventIdPayload,
    Partial<IUserIdPayload> {}

export interface IFallbackCreateTagPayload extends IEventIdPayload, Partial<IUserIdPayload> {}

export interface IFallbackUpdateTagPayload extends IEventIdPayload, Partial<IUserIdPayload> {}

export interface IFallbackDeleteTagPayload extends IEventIdPayload, Partial<IUserIdPayload> {}
