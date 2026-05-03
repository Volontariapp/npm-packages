import type {
  PostUserParticipateEventResponse,
  DeleteUserParticipateEventResponse,
  PostUserWishEventResponse,
  DeleteUserWishEventResponse,
  AdminPostUserParticipateEventResponse,
  AdminDeleteUserParticipateEventResponse,
  AdminPostUserWishEventResponse,
  AdminDeleteUserWishEventResponse,
  PostUserEventResponse,
  DeleteUserEventResponse,
  GetUserEventResponse,
  GetUserParticipateEventResponse,
  GetUserWishEventResponse,
  GetEventParticipantsResponse,
  AdminGetUserEventResponse,
  AdminGetUserParticipateEventResponse,
  AdminGetUserWishEventResponse,
} from '../../../social/social.responses.js';

// Self-service participation
export interface PostUserParticipateEventWebResponse extends PostUserParticipateEventResponse {}
export interface DeleteUserParticipateEventWebResponse extends DeleteUserParticipateEventResponse {}

// Self-service wish
export interface PostUserWishEventWebResponse extends PostUserWishEventResponse {}
export interface DeleteUserWishEventWebResponse extends DeleteUserWishEventResponse {}

// Admin participation
export interface AdminPostUserParticipateEventWebResponse
  extends AdminPostUserParticipateEventResponse {}
export interface AdminDeleteUserParticipateEventWebResponse
  extends AdminDeleteUserParticipateEventResponse {}

// Admin wish
export interface AdminPostUserWishEventWebResponse extends AdminPostUserWishEventResponse {}
export interface AdminDeleteUserWishEventWebResponse extends AdminDeleteUserWishEventResponse {}

// Admin-only: manage which user owns event
export interface PostUserEventWebResponse extends PostUserEventResponse {}
export interface DeleteUserEventWebResponse extends DeleteUserEventResponse {}

// Self-service queries
export interface GetUserEventWebResponse extends GetUserEventResponse {}
export interface GetUserParticipateEventWebResponse extends GetUserParticipateEventResponse {}
export interface GetUserWishEventWebResponse extends GetUserWishEventResponse {}

// Post-scoped query
export interface GetEventParticipantsWebResponse extends GetEventParticipantsResponse {}

// Admin queries
export interface AdminGetUserEventWebResponse extends AdminGetUserEventResponse {}
export interface AdminGetUserParticipateEventWebResponse
  extends AdminGetUserParticipateEventResponse {}
export interface AdminGetUserWishEventWebResponse extends AdminGetUserWishEventResponse {}
