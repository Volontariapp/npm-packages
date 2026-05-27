import { EventEventMessagingType } from './event/payloads.js';
import type {
  IEventPayload,
  IRequirementPayload,
  ITagPayload,
  IEventTagLinkedPayload,
} from './event/payloads.js';

import { UserEventMessagingType } from './user/payloads.js';
import type {
  IUserPayload,
  IBadgePayload,
  IUserCreatedPayload,
  IUserDeleledPayload,
} from './user/payloads.js';

import { SocialEventMessagingType } from './social/payloads.js';
import type {
  ISocialUserPayload,
  ISocialPostPayload,
  ISocialEventPayload,
} from './social/payloads.js';

import { CommonEventMessagingType } from './common/payloads.js';
import type { IJobAuditPayload } from './common/payloads.js';
import type {
  IEventCreatedWebsocketPayload,
  IEventUpdatedWebsocketPayload,
  IEventDeletedWebsocketPayload,
  IEventStateChangedWebsocketPayload,
  IEventRequirementsManagedWebsocketPayload,
  IUserCreatedWebsocketPayload,
  IUserUpdatedWebsocketPayload,
  IUserDeletedWebsocketPayload,
  IUserBadgeAddedWebsocketPayload,
  IUserBadgeRemovedWebsocketPayload,
  IUserImpactScoreIncrementedWebsocketPayload,
  ITagCreatedWebsocketPayload,
  ITagUpdatedWebsocketPayload,
  ITagDeletedWebsocketPayload,
  IBadgeCreatedWebsocketPayload,
  IBadgeUpdatedWebsocketPayload,
  IBadgeDeletedWebsocketPayload,
} from './ws/payloads.js';
import { WebsocketEventMessagingType } from './ws/payloads.js';

export interface EventRegistry {
  // Event
  [EventEventMessagingType.EVENT_CHANGED]: IEventPayload;
  [EventEventMessagingType.EVENT_CREATED]: IEventPayload;
  [EventEventMessagingType.EVENT_DELETED]: IEventPayload;
  [EventEventMessagingType.REQUIREMENT_CHANGED]: IRequirementPayload;
  [EventEventMessagingType.TAG_CHANGED]: ITagPayload;
  [EventEventMessagingType.EVENT_TAG_LINKED]: IEventTagLinkedPayload;

  // Common
  [CommonEventMessagingType.JOB_OUTBOX_SUCCESS]: IJobAuditPayload;
  [CommonEventMessagingType.JOB_OUTBOX_FAILED]: IJobAuditPayload;

  // User
  [UserEventMessagingType.USER_CHANGED]: IUserPayload;
  [UserEventMessagingType.BADGE_CHANGED]: IBadgePayload;
  [UserEventMessagingType.USER_CREATED]: IUserCreatedPayload;
  [UserEventMessagingType.USER_DELETED]: IUserDeleledPayload;

  // Social
  [SocialEventMessagingType.SOCIAL_USER_CHANGED]: ISocialUserPayload;
  [SocialEventMessagingType.SOCIAL_POST_CHANGED]: ISocialPostPayload;
  [SocialEventMessagingType.SOCIAL_EVENT_CHANGED]: ISocialEventPayload;

  // WS
  [WebsocketEventMessagingType.WS_EVENT_CREATED]: IEventCreatedWebsocketPayload;
  [WebsocketEventMessagingType.WS_EVENT_UPDATED]: IEventUpdatedWebsocketPayload;
  [WebsocketEventMessagingType.WS_EVENT_DELETED]: IEventDeletedWebsocketPayload;
  [WebsocketEventMessagingType.WS_EVENT_STATE_CHANGED]: IEventStateChangedWebsocketPayload;
  [WebsocketEventMessagingType.WS_EVENT_REQUIREMENTS_MANAGED]: IEventRequirementsManagedWebsocketPayload;

  [WebsocketEventMessagingType.WS_USER_CREATED]: IUserCreatedWebsocketPayload;
  [WebsocketEventMessagingType.WS_USER_UPDATED]: IUserUpdatedWebsocketPayload;
  [WebsocketEventMessagingType.WS_USER_DELETED]: IUserDeletedWebsocketPayload;
  [WebsocketEventMessagingType.WS_USER_BADGE_ADDED]: IUserBadgeAddedWebsocketPayload;
  [WebsocketEventMessagingType.WS_USER_BADGE_REMOVED]: IUserBadgeRemovedWebsocketPayload;
  [WebsocketEventMessagingType.WS_USER_IMPACT_SCORE_INCREMENTED]: IUserImpactScoreIncrementedWebsocketPayload;

  [WebsocketEventMessagingType.WS_TAG_CREATED]: ITagCreatedWebsocketPayload;
  [WebsocketEventMessagingType.WS_TAG_UPDATED]: ITagUpdatedWebsocketPayload;
  [WebsocketEventMessagingType.WS_TAG_DELETED]: ITagDeletedWebsocketPayload;

  [WebsocketEventMessagingType.WS_BADGE_CREATED]: IBadgeCreatedWebsocketPayload;
  [WebsocketEventMessagingType.WS_BADGE_UPDATED]: IBadgeUpdatedWebsocketPayload;
  [WebsocketEventMessagingType.WS_BADGE_DELETED]: IBadgeDeletedWebsocketPayload;
}

export const EventMessagingType = {
  ...EventEventMessagingType,
  ...UserEventMessagingType,
  ...SocialEventMessagingType,
  ...CommonEventMessagingType,
  ...WebsocketEventMessagingType,
} as const;

export type EventMessagingType = (typeof EventMessagingType)[keyof typeof EventMessagingType];

export * from './event/payloads.js';
export * from './user/payloads.js';
export * from './social/payloads.js';
export * from './post/payloads.js';
export * from './common/payloads.js';
export * from './ws/payloads.js';

export * from './utils.js';
