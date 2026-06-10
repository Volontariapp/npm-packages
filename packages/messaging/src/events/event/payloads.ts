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
