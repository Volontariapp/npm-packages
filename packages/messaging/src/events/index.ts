import { EventEventMessagingType } from './event/payloads.js';
import type {
  IEventPayload,
  IRequirementPayload,
  ITagPayload,
  IEventTagLinkedPayload,
} from './event/payloads.js';

import { UserEventMessagingType } from './user/payloads.js';
import type { IUserPayload, IBadgePayload } from './user/payloads.js';

import { SocialEventMessagingType } from './social/payloads.js';
import type {
  ISocialUserPayload,
  ISocialPostPayload,
  ISocialEventPayload,
} from './social/payloads.js';

import { CommonEventMessagingType } from './common/payloads.js';
import type { EventChangedPayload, IJobAuditPayload } from './common/payloads.js';

export interface EventRegistry {
  // Event
  [EventEventMessagingType.EVENT_CHANGED]: EventChangedPayload<IEventPayload>;
  [EventEventMessagingType.REQUIREMENT_CHANGED]: EventChangedPayload<IRequirementPayload>;
  [EventEventMessagingType.TAG_CHANGED]: EventChangedPayload<ITagPayload>;
  [EventEventMessagingType.EVENT_TAG_LINKED]: EventChangedPayload<IEventTagLinkedPayload>;

  // Common
  [CommonEventMessagingType.JOB_OUTBOX_SUCCESS]: EventChangedPayload<IJobAuditPayload>;
  [CommonEventMessagingType.JOB_OUTBOX_FAILED]: EventChangedPayload<IJobAuditPayload>;

  // User
  [UserEventMessagingType.USER_CHANGED]: EventChangedPayload<IUserPayload>;
  [UserEventMessagingType.BADGE_CHANGED]: EventChangedPayload<IBadgePayload>;

  // Social
  [SocialEventMessagingType.SOCIAL_USER_CHANGED]: EventChangedPayload<ISocialUserPayload>;
  [SocialEventMessagingType.SOCIAL_POST_CHANGED]: EventChangedPayload<ISocialPostPayload>;
  [SocialEventMessagingType.SOCIAL_EVENT_CHANGED]: EventChangedPayload<ISocialEventPayload>;
}

export const EventMessagingType = {
  ...EventEventMessagingType,
  ...UserEventMessagingType,
  ...SocialEventMessagingType,
  ...CommonEventMessagingType,
} as const;

export type EventMessagingType = (typeof EventMessagingType)[keyof typeof EventMessagingType];

export * from './event/payloads.js';
export * from './user/payloads.js';
export * from './social/payloads.js';
export * from './post/payloads.js';
export * from './common/payloads.js';
export * from './utils.js';
