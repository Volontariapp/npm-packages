import { UserJobType } from './user/payloads.js';
import type { ISendWelcomeEmailPayload, IResetPasswordPayload } from './user/payloads.js';

export const JobMessagingType = {
  ...UserJobType,
} as const;

export type JobMessagingType = (typeof JobMessagingType)[keyof typeof JobMessagingType];

export interface JobRegistry {
  [JobMessagingType.SEND_WELCOME_EMAIL]: ISendWelcomeEmailPayload;
  [JobMessagingType.RESET_PASSWORD]: IResetPasswordPayload;
}

export * from './user/payloads.js';
