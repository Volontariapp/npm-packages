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
  ISocialEventDeletedSuccessPayload,
  ISocialEventDeletedFailedPayload,
} from './social/payloads.js';

import { PostEventMessagingType } from './post/payloads.js';
import type {
  IPostCreatedPayload,
  IPostDeletedPayload,
  IPostEventDeletedSuccessPayload,
  IPostEventDeletedFailedPayload,
  ICommentCreatedPayload,
  ICommentDeletedPayload,
} from './post/payloads.js';

import { CommonEventMessagingType } from './common/payloads.js';
import type { IFeedbackEventPayload, IJobAuditPayload } from './common/payloads.js';

import type { JobMessagingType } from '../jobs/index.js';
import type { JobRegistry } from '../jobs/index.js';

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

  // Event FallBack
  [EventEventMessagingType.FALLBACK_CREATE_EVENT]: IFeedbackEventPayload<
    JobRegistry[typeof JobMessagingType.FALLBACK_CREATE_EVENT]
  >;
  [EventEventMessagingType.FALLBACK_UPDATE_EVENT]: IFeedbackEventPayload<
    JobRegistry[typeof JobMessagingType.FALLBACK_UPDATE_EVENT]
  >;
  [EventEventMessagingType.FALLBACK_DELETE_EVENT]: IFeedbackEventPayload<
    JobRegistry[typeof JobMessagingType.FALLBACK_DELETE_EVENT]
  >;
  [EventEventMessagingType.FALLBACK_CHANGE_EVENT_STATE]: IFeedbackEventPayload<
    JobRegistry[typeof JobMessagingType.FALLBACK_CHANGE_EVENT_STATE]
  >;
  [EventEventMessagingType.FALLBACK_MANAGE_REQUIREMENTS]: IFeedbackEventPayload<
    JobRegistry[typeof JobMessagingType.FALLBACK_MANAGE_REQUIREMENTS]
  >;
  [EventEventMessagingType.FALLBACK_CREATE_TAG]: IFeedbackEventPayload<
    JobRegistry[typeof JobMessagingType.FALLBACK_CREATE_TAG]
  >;
  [EventEventMessagingType.FALLBACK_UPDATE_TAG]: IFeedbackEventPayload<
    JobRegistry[typeof JobMessagingType.FALLBACK_UPDATE_TAG]
  >;
  [EventEventMessagingType.FALLBACK_DELETE_TAG]: IFeedbackEventPayload<
    JobRegistry[typeof JobMessagingType.FALLBACK_DELETE_TAG]
  >;

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
  [SocialEventMessagingType.SOCIAL_EVENT_DELETED_SUCCESS]: ISocialEventDeletedSuccessPayload;
  [SocialEventMessagingType.SOCIAL_EVENT_DELETED_FAILED]: ISocialEventDeletedFailedPayload;
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
  [PostEventMessagingType.POST_EVENT_DELETED_SUCCESS]: IPostEventDeletedSuccessPayload;
  [PostEventMessagingType.POST_EVENT_DELETED_FAILED]: IPostEventDeletedFailedPayload;
  [PostEventMessagingType.COMMENT_CREATED]: ICommentCreatedPayload;
  [PostEventMessagingType.COMMENT_DELETED]: ICommentDeletedPayload;

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
