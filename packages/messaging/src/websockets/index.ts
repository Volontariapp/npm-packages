import type {
  IEventCreatedWebsocketPayload,
  IEventDeletedWebsocketPayload,
  IEventCreationFailedWebsocketPayload,
  IEventDeletionFailedWebsocketPayload,
} from './events/index.js';
import { EventWebsocketMessagingType } from './events/index.js';
import type {
  IUserCreatedWebsocketPayload,
  IUserCreationFailedWebsocketPayload,
  IUserDeletedWebsocketPayload,
  IUserDeletionFailedWebsocketPayload,
} from './users/index.js';
import { UserWebsocketMessagingType } from './users/index.js';
import type {
  IPostCreatedWebsocketPayload,
  IPostCreationFailedWebsocketPayload,
  IPostDeletedWebsocketPayload,
  IPostDeletionFailedWebsocketPayload,
} from './posts/index.js';
import { PostWebsocketMessagingType } from './posts/index.js';

export * from './events/index.js';
export * from './posts/index.js';
export * from './users/index.js';
export * from './common/index.js';

export interface WebsocketEventRegistry {
  [EventWebsocketMessagingType.EVENT_CREATED]: IEventCreatedWebsocketPayload;
  [EventWebsocketMessagingType.EVENT_DELETED]: IEventDeletedWebsocketPayload;
  [EventWebsocketMessagingType.EVENT_CREATION_FAILED]: IEventCreationFailedWebsocketPayload;
  [EventWebsocketMessagingType.EVENT_DELETION_FAILED]: IEventDeletionFailedWebsocketPayload;

  [UserWebsocketMessagingType.USER_CREATED]: IUserCreatedWebsocketPayload;
  [UserWebsocketMessagingType.USER_DELETED]: IUserDeletedWebsocketPayload;
  [UserWebsocketMessagingType.USER_CREATION_FAILED]: IUserCreationFailedWebsocketPayload;
  [UserWebsocketMessagingType.USER_DELETION_FAILED]: IUserDeletionFailedWebsocketPayload;

  [PostWebsocketMessagingType.POST_CREATED]: IPostCreatedWebsocketPayload;
  [PostWebsocketMessagingType.POST_DELETED]: IPostDeletedWebsocketPayload;
  [PostWebsocketMessagingType.POST_CREATION_FAILED]: IPostCreationFailedWebsocketPayload;
  [PostWebsocketMessagingType.POST_DELETION_FAILED]: IPostDeletionFailedWebsocketPayload;
}

export const WebsocketMessagingType = {
  ...EventWebsocketMessagingType,
  ...UserWebsocketMessagingType,
  ...PostWebsocketMessagingType,
} as const;

export type WebsocketMessagingType =
  (typeof WebsocketMessagingType)[keyof typeof WebsocketMessagingType];
