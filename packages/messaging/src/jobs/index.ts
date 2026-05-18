import { UserJobType } from './user/payloads.js';
import type { ISendWelcomeEmailPayload, IResetPasswordPayload } from './user/payloads.js';
import { SocialJobType } from './social/payloads.js';
import type { IFollowUserPayload } from './social/payloads.js';
import { EventsJobType } from './event/payloads.js';
import type { IPublishEventPayload } from './event/payloads.js';
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
}

export * from './user/payloads.js';
export * from './user/queue.js';
export * from './social/payloads.js';
export * from './social/queue.js';
export * from './event/payloads.js';
export * from './event/queue.js';
export * from './post/payloads.js';
export * from './post/queue.js';
