import type {
  CreateUserNodeResponse,
  DeleteUserNodeResponse,
  GetUserNodeResponse,
  PostFollowUserResponse,
  DeleteFollowUserResponse,
  PostBlockUserResponse,
  DeleteBlockUserResponse,
  GetMyFollowsResponse,
  GetMyFollowersResponse,
  GetMyBlocksResponse,
  GetWhoBlockedMeResponse,
  CreatePostNodeResponse,
  DeletePostNodeResponse,
  PostUserOwnResponse,
  DeleteUserOwnResponse,
  GetPostNodeResponse,
  GetUserPostsResponse,
  GetFeedResponse,
  PostLikePostResponse,
  DeleteLikePostResponse,
  GetUserLikesResponse,
  GetPostLikersResponse,
  CreateEventNodeResponse,
  DeleteEventNodeResponse,
  PostUserEventResponse,
  DeleteUserEventResponse,
  PostUserParticipateEventResponse,
  DeleteUserParticipateEventResponse,
  GetUserEventResponse,
  GetUserParticipateEventResponse,
  GetEventParticipantsResponse,
  LinkPostToEventResponse,
  UnlinkPostFromEventResponse,
  GetEventRelatedToPostResponse,
  GetEventPostsResponse,
} from '../../../social/social.responses.js';

// Nodes
export interface CreateUserNodeWebResponse extends CreateUserNodeResponse {}
export interface DeleteUserNodeWebResponse extends DeleteUserNodeResponse {}
export interface GetUserNodeWebResponse extends GetUserNodeResponse {}

// Relationships
export interface PostFollowUserWebResponse extends PostFollowUserResponse {}
export interface DeleteFollowUserWebResponse extends DeleteFollowUserResponse {}
export interface PostBlockUserWebResponse extends PostBlockUserResponse {}
export interface DeleteBlockUserWebResponse extends DeleteBlockUserResponse {}

export interface GetMyFollowsWebResponse extends GetMyFollowsResponse {}
export interface GetMyFollowersWebResponse extends GetMyFollowersResponse {}
export interface GetMyBlocksWebResponse extends GetMyBlocksResponse {}
export interface GetWhoBlockedMeWebResponse extends GetWhoBlockedMeResponse {}

// Posts
export interface CreatePostNodeWebResponse extends CreatePostNodeResponse {}
export interface DeletePostNodeWebResponse extends DeletePostNodeResponse {}
export interface PostUserOwnWebResponse extends PostUserOwnResponse {}
export interface DeleteUserOwnWebResponse extends DeleteUserOwnResponse {}

export interface GetPostNodeWebResponse extends GetPostNodeResponse {}
export interface GetUserPostsWebResponse extends GetUserPostsResponse {}
export interface GetFeedWebResponse extends GetFeedResponse {}

// Interactions
export interface PostLikePostWebResponse extends PostLikePostResponse {}
export interface DeleteLikePostWebResponse extends DeleteLikePostResponse {}

export interface GetUserLikesWebResponse extends GetUserLikesResponse {}
export interface GetPostLikersWebResponse extends GetPostLikersResponse {}

// Events
export interface CreateEventNodeWebResponse extends CreateEventNodeResponse {}
export interface DeleteEventNodeWebResponse extends DeleteEventNodeResponse {}
export interface PostUserEventWebResponse extends PostUserEventResponse {}
export interface DeleteUserEventWebResponse extends DeleteUserEventResponse {}
export interface PostUserParticipateEventWebResponse extends PostUserParticipateEventResponse {}
export interface DeleteUserParticipateEventWebResponse extends DeleteUserParticipateEventResponse {}

export interface GetUserEventWebResponse extends GetUserEventResponse {}
export interface GetUserParticipateEventWebResponse extends GetUserParticipateEventResponse {}
export interface GetEventParticipantsWebResponse extends GetEventParticipantsResponse {}

// Event-Post links
export interface LinkPostToEventWebResponse extends LinkPostToEventResponse {}
export interface UnlinkPostFromEventWebResponse extends UnlinkPostFromEventResponse {}

export interface GetEventRelatedToPostWebResponse extends GetEventRelatedToPostResponse {}
export interface GetEventPostsWebResponse extends GetEventPostsResponse {}
