import type {
  PostUserParticipateEventCommand,
  DeleteUserParticipateEventCommand,
  PostUserWishEventCommand,
  DeleteUserWishEventCommand,
  AdminPostUserParticipateEventCommand,
  AdminDeleteUserParticipateEventCommand,
  AdminPostUserWishEventCommand,
  AdminDeleteUserWishEventCommand,
  PostUserEventCommand,
  DeleteUserEventCommand,
} from '../../../social/social.command.js';
import type {
  GetUserEventQuery,
  GetUserParticipateEventQuery,
  GetUserWishEventQuery,
  GetEventParticipantsQuery,
  AdminGetUserEventQuery,
  AdminGetUserParticipateEventQuery,
  AdminGetUserWishEventQuery,
} from '../../../social/social.query.js';

// Self-service participation
export interface PostUserParticipateEventWebRequest extends PostUserParticipateEventCommand {}
export interface DeleteUserParticipateEventWebRequest extends DeleteUserParticipateEventCommand {}

// Self-service wish
export interface PostUserWishEventWebRequest extends PostUserWishEventCommand {}
export interface DeleteUserWishEventWebRequest extends DeleteUserWishEventCommand {}

// Admin participation
export interface AdminPostUserParticipateEventWebRequest
  extends Omit<AdminPostUserParticipateEventCommand, 'userId'> {}
export interface AdminDeleteUserParticipateEventWebRequest
  extends Omit<AdminDeleteUserParticipateEventCommand, 'userId'> {}

// Admin wish
export interface AdminPostUserWishEventWebRequest
  extends Omit<AdminPostUserWishEventCommand, 'userId'> {}
export interface AdminDeleteUserWishEventWebRequest
  extends Omit<AdminDeleteUserWishEventCommand, 'userId'> {}

// Admin-only: manage which user owns event
export interface PostUserEventWebRequest extends PostUserEventCommand {}
export interface DeleteUserEventWebRequest extends DeleteUserEventCommand {}

// Self-service queries
export interface GetUserEventWebRequest extends Partial<GetUserEventQuery> {}
export interface GetUserParticipateEventWebRequest extends Partial<GetUserParticipateEventQuery> {}
export interface GetUserWishEventWebRequest extends Partial<GetUserWishEventQuery> {}

// Post-scoped query
export interface GetEventParticipantsWebRequest extends Partial<GetEventParticipantsQuery> {}

// Admin queries
export interface AdminGetUserEventWebRequest extends Omit<AdminGetUserEventQuery, 'userId'> {}
export interface AdminGetUserParticipateEventWebRequest
  extends Omit<AdminGetUserParticipateEventQuery, 'userId'> {}
export interface AdminGetUserWishEventWebRequest
  extends Omit<AdminGetUserWishEventQuery, 'userId'> {}
