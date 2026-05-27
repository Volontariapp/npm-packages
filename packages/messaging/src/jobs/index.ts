import { UserJobType } from './user/payloads.js';
import type {
  ISendWelcomeEmailPayload,
  IResetPasswordPayload,
  IFallbackGetMyFollowsJobPayload,
  IFallbackGetMyFollowersJobPayload,
  IFallbackGetPostLikersJobPayload,
  IFallbackGetEventParticipantsJobPayload,
  IFallbackCreateBadgeJobPayload,
  IFallbackUpdateBadgeJobPayload,
  IFallbackDeleteBadgeJobPayload,
  IFallbackSignUpJobPayload,
  IFallbackUpdateUserJobPayload,
  IFallbackDeleteUserJobPayload,
  IFallbackAddBadgeToUserJobPayload,
  IFallbackRemoveBadgeFromUserJobPayload,
  IFallbackIncrementImpactScoreJobPayload,
} from './user/payloads.js';
import { SocialJobType } from './social/payloads.js';
import type { IFollowUserPayload } from './social/payloads.js';
import { EventsJobType } from './event/payloads.js';
import type {
  IPublishEventPayload,
  IFallbackGetUserCreatedEventsJobPayload,
  IFallbackGetUserParticipatedEventsJobPayload,
  IFallbackGetUserWishedEventsJobPayload,
  IFallbackCreateEventJobPayload,
  IFallbackUpdateEventJobPayload,
  IFallbackChangeEventStateJobPayload,
  IFallbackManageRequirementsJobPayload,
  IFallbackDeleteEventJobPayload,
  IFallbackCreateTagJobPayload,
  IFallbackUpdateTagJobPayload,
  IFallbackDeleteTagJobPayload,
} from './event/payloads.js';
import { PostJobType } from './post/payloads.js';
import type { IPublishPostPayload } from './post/payloads.js';

export const JobMessagingType = {
  ...UserJobType,
  ...SocialJobType,
  ...EventsJobType,
  ...PostJobType,
} as const;

export type JobMessagingType = (typeof JobMessagingType)[keyof typeof JobMessagingType];

export interface JobRegistry {
  [JobMessagingType.SEND_WELCOME_EMAIL]: ISendWelcomeEmailPayload;
  [JobMessagingType.RESET_PASSWORD]: IResetPasswordPayload;
  [JobMessagingType.FOLLOW_USER]: IFollowUserPayload;
  [JobMessagingType.PUBLISH_EVENT]: IPublishEventPayload;
  [JobMessagingType.PUBLISH_POST]: IPublishPostPayload;
  [JobMessagingType.FALLBACK_GET_MY_FOLLOWS]: IFallbackGetMyFollowsJobPayload;
  [JobMessagingType.FALLBACK_GET_MY_FOLLOWERS]: IFallbackGetMyFollowersJobPayload;
  [JobMessagingType.FALLBACK_GET_POST_LIKERS]: IFallbackGetPostLikersJobPayload;
  [JobMessagingType.FALLBACK_GET_EVENT_PARTICIPANTS]: IFallbackGetEventParticipantsJobPayload;
  [JobMessagingType.FALLBACK_CREATE_BADGE]: IFallbackCreateBadgeJobPayload;
  [JobMessagingType.FALLBACK_UPDATE_BADGE]: IFallbackUpdateBadgeJobPayload;
  [JobMessagingType.FALLBACK_DELETE_BADGE]: IFallbackDeleteBadgeJobPayload;
  [JobMessagingType.FALLBACK_SIGN_UP]: IFallbackSignUpJobPayload;
  [JobMessagingType.FALLBACK_UPDATE_USER]: IFallbackUpdateUserJobPayload;
  [JobMessagingType.FALLBACK_DELETE_USER]: IFallbackDeleteUserJobPayload;
  [JobMessagingType.FALLBACK_ADD_BADGE_TO_USER]: IFallbackAddBadgeToUserJobPayload;
  [JobMessagingType.FALLBACK_REMOVE_BADGE_FROM_USER]: IFallbackRemoveBadgeFromUserJobPayload;
  [JobMessagingType.FALLBACK_INCREMENT_IMPACT_SCORE]: IFallbackIncrementImpactScoreJobPayload;
  [JobMessagingType.FALLBACK_GET_USER_CREATED_EVENTS]: IFallbackGetUserCreatedEventsJobPayload;
  [JobMessagingType.FALLBACK_GET_USER_PARTICIPATED_EVENTS]: IFallbackGetUserParticipatedEventsJobPayload;
  [JobMessagingType.FALLBACK_GET_USER_WISHED_EVENTS]: IFallbackGetUserWishedEventsJobPayload;
  [JobMessagingType.FALLBACK_CREATE_EVENT]: IFallbackCreateEventJobPayload;
  [JobMessagingType.FALLBACK_UPDATE_EVENT]: IFallbackUpdateEventJobPayload;
  [JobMessagingType.FALLBACK_CHANGE_EVENT_STATE]: IFallbackChangeEventStateJobPayload;
  [JobMessagingType.FALLBACK_MANAGE_REQUIREMENTS]: IFallbackManageRequirementsJobPayload;
  [JobMessagingType.FALLBACK_DELETE_EVENT]: IFallbackDeleteEventJobPayload;
  [JobMessagingType.FALLBACK_CREATE_TAG]: IFallbackCreateTagJobPayload;
  [JobMessagingType.FALLBACK_UPDATE_TAG]: IFallbackUpdateTagJobPayload;
  [JobMessagingType.FALLBACK_DELETE_TAG]: IFallbackDeleteTagJobPayload;
}

export * from './user/payloads.js';
export * from './user/queue.js';
export * from './social/payloads.js';
export * from './social/queue.js';
export * from './event/payloads.js';
export * from './event/queue.js';
export * from './post/payloads.js';
export * from './post/queue.js';
export * from './envelope.js';
