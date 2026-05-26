import type { IEventPayload } from '../event/payloads.js';
import type { IUserCreatedPayload } from '../user/payloads.js';

export enum WebsocketEventMessagingType {
  WS_USER_CREATED = 'ws.user.created',
  WS_EVENT_DELETED = 'ws.event.deleted',
  WS_EVENT_CREATED = 'ws.event.created',
}

export interface IEventCreatedWebsocketPayload extends IEventPayload {}
export interface IEventDeletedWebsocketPayload extends IEventPayload {}
export interface IUserCreatedWebsocketPayload extends IUserCreatedPayload {}
