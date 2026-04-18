import { NotFoundError } from '@volontariapp/errors';

export const SOCIAL_USER_NOT_FOUND = (userId: string) =>
  new NotFoundError(`Social user node with id ${userId} not found`);

export const SOCIAL_POST_NOT_FOUND = (postId: string) =>
  new NotFoundError(`Social post node with id ${postId} not found`);

export const SOCIAL_EVENT_NOT_FOUND = (eventId: string) =>
  new NotFoundError(`Social event node with id ${eventId} not found`);
