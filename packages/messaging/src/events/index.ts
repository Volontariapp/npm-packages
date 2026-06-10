import { EventEventMessagingType } from './event/payloads.js';
import type {
  IEventGeocodedPayload,
  IEventGeocodingFailedPayload,
  IEventCreationSuccessfullPayload,
  IEventCreationFailedPayload,
  IEventDeletionSuccessfullPayload,
  IEventDeletionFailedPayload,
  IEventCreatedPayload,
  IEventDeletedPayload,
} from './event/payloads.js';

import { UserEventMessagingType } from './user/payloads.js';
import type { IUserCreatedPayload, IUserDeleledPayload } from './user/payloads.js';

import { SocialEventMessagingType } from './social/payloads.js';
import type {
  IEventSocialCreatedPayload,
  IEventSocialCreationFailedPayload,
  IEventSocialDeletedPayload,
  IEventSocialDeletionFailedPayload,
  IPostSocialCreatedPayload,
  IPostSocialCreationFailedPayload,
  IPostSocialDeletedPayload,
  IPostSocialDeletionFailedPayload,
  IUserSocialCreatedPayload,
  IUserSocialCreationFailedPayload,
  IUserSocialDeletedPayload,
  IUserSocialDeletionFailedPayload,
} from './social/payloads.js';

import { PostEventMessagingType } from './post/payloads.js';
import type { IPostCreatedPayload, IPostDeletedPayload } from './post/payloads.js';

import { CommonEventMessagingType } from './common/payloads.js';
import type { IJobAuditPayload } from './common/payloads.js';

export interface EventRegistry {
  // Event
  [EventEventMessagingType.EVENT_CREATED]: IEventCreatedPayload;
  [EventEventMessagingType.EVENT_CREATION_SUCCESSFULL]: IEventCreationSuccessfullPayload;
  [EventEventMessagingType.EVENT_CREATION_FAILED]: IEventCreationFailedPayload;
  [EventEventMessagingType.EVENT_DELETED]: IEventDeletedPayload;
  [EventEventMessagingType.EVENT_DELETION_FAILED]: IEventDeletionFailedPayload;
  [EventEventMessagingType.EVENT_DELETION_SUCCESSFULL]: IEventDeletionSuccessfullPayload;

  [EventEventMessagingType.EVENT_GEOCODED]: IEventGeocodedPayload;
  [EventEventMessagingType.EVENT_GEOCODING_FAILED]: IEventGeocodingFailedPayload;

  // Common
  [CommonEventMessagingType.JOB_OUTBOX_SUCCESS]: IJobAuditPayload;
  [CommonEventMessagingType.JOB_OUTBOX_FAILED]: IJobAuditPayload;

  // User
  [UserEventMessagingType.USER_CREATED]: IUserCreatedPayload;
  [UserEventMessagingType.USER_DELETED]: IUserDeleledPayload;

  // Social
  [SocialEventMessagingType.EVENT_SOCIAL_CREATED]: IEventSocialCreatedPayload;
  [SocialEventMessagingType.EVENT_SOCIAL_CREATION_FAILED]: IEventSocialCreationFailedPayload;
  [SocialEventMessagingType.EVENT_SOCIAL_DELETED]: IEventSocialDeletedPayload;
  [SocialEventMessagingType.EVENT_SOCIAL_DELETION_FAILED]: IEventSocialDeletionFailedPayload;
  [SocialEventMessagingType.POST_SOCIAL_CREATED]: IPostSocialCreatedPayload;
  [SocialEventMessagingType.POST_SOCIAL_CREATION_FAILED]: IPostSocialCreationFailedPayload;
  [SocialEventMessagingType.POST_SOCIAL_DELETED]: IPostSocialDeletedPayload;
  [SocialEventMessagingType.POST_SOCIAL_DELETION_FAILED]: IPostSocialDeletionFailedPayload;
  [SocialEventMessagingType.USER_SOCIAL_CREATED]: IUserSocialCreatedPayload;
  [SocialEventMessagingType.USER_SOCIAL_CREATION_FAILED]: IUserSocialCreationFailedPayload;
  [SocialEventMessagingType.USER_SOCIAL_DELETED]: IUserSocialDeletedPayload;
  [SocialEventMessagingType.USER_SOCIAL_DELETION_FAILED]: IUserSocialDeletionFailedPayload;

  // Post
  [PostEventMessagingType.POST_CREATED]: IPostCreatedPayload;
  [PostEventMessagingType.POST_DELETED]: IPostDeletedPayload;

  // WS
}

export const EventMessagingType = {
  ...EventEventMessagingType,
  ...UserEventMessagingType,
  ...SocialEventMessagingType,
  ...PostEventMessagingType,
  ...CommonEventMessagingType,
} as const;

export type EventMessagingType = (typeof EventMessagingType)[keyof typeof EventMessagingType];

export * from './event/payloads.js';
export * from './user/payloads.js';
export * from './social/payloads.js';
export * from './post/payloads.js';
export * from './common/payloads.js';

export * from './utils.js';
