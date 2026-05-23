import type { IEventPayload } from '../event/payloads.js';

export enum WebsocketEventMessagingType {
  EVENT_CREATED = 'event.created',
}

export interface IEventCreatedWebsocketPayload extends IEventPayload {}
