import { NotFoundError, ConflictError } from '@volontariapp/errors';

export const SOCIAL_USER_NOT_FOUND = (userId: string) =>
  new NotFoundError(`Social user node with id ${userId} not found`);

export const SOCIAL_USER_ALREADY_EXISTS = (userId: string) =>
  new ConflictError(`Social user node with id ${userId} already exists`);

export const SOCIAL_POST_NOT_FOUND = (postId: string) =>
  new NotFoundError(`Social post node with id ${postId} not found`);

export const SOCIAL_POST_ALREADY_EXISTS = (postId: string) =>
  new ConflictError(`Social post node with id ${postId} already exists`);

export const SOCIAL_EVENT_NOT_FOUND = (eventId: string) =>
  new NotFoundError(`Social event node with id ${eventId} not found`);

export const SOCIAL_EVENT_ALREADY_EXISTS = (eventId: string) =>
  new ConflictError(`Social event node with id ${eventId} already exists`);

export const SOCIAL_RELATIONSHIP_ALREADY_EXISTS = (from: string, to: string, type: string) =>
  new ConflictError(`Relationship ${type} from ${from} to ${to} already exists`);

export const SOCIAL_RELATIONSHIP_NOT_FOUND = (from: string, to: string, type: string) =>
  new NotFoundError(`Relationship ${type} from ${from} to ${to} not found`);

export const SOCIAL_PARTICIPATION_ALREADY_EXISTS = (userId: string, eventId: string) =>
  new ConflictError(`Participation of user ${userId} in event ${eventId} already exists`);

export const SOCIAL_PARTICIPATION_NOT_FOUND = (userId: string, eventId: string) =>
  new NotFoundError(`Participation of user ${userId} in event ${eventId} not found`);
