import type { IEventPayload } from '../event/payloads.js';

export enum WebsocketEventMessagingType {
  WS_EVENT_CREATED = 'ws.event.created',
}

export interface IEventCreatedWebsocketPayload extends IEventPayload {}
