import type {
  PostFollowUserCommand,
  DeleteFollowUserCommand,
  PostBlockUserCommand,
  DeleteBlockUserCommand,
  PostUserOwnCommand,
  DeleteUserOwnCommand,
  PostLikePostCommand,
  DeleteLikePostCommand,
  PostUserEventCommand,
  DeleteUserEventCommand,
  PostUserParticipateEventCommand,
  DeleteUserParticipateEventCommand,
  LinkPostToEventCommand,
  UnlinkPostFromEventCommand,
  CreateSocialUserCommand,
  DeleteSocialUserCommand,
  CreateSocialPostCommand,
  DeleteSocialPostCommand,
  CreateSocialEventCommand,
  DeleteSocialEventCommand,
} from '../../../social/social.command.js';
import type {
  GetMyFollowsQuery,
  GetMyFollowersQuery,
  GetMyBlocksQuery,
  GetWhoBlockedMeQuery,
  GetUserPostsQuery,
  GetFeedQuery,
  GetUserLikesQuery,
  GetPostLikersQuery,
  GetUserEventQuery,
  GetUserParticipateEventQuery,
  GetEventParticipantsQuery,
  GetEventPostsQuery,
  GetSocialUserQuery,
  GetSocialPostQuery,
  GetEventRelatedToPostQuery,
} from '../../../social/social.query.js';

// Nodes
export interface CreateSocialUserWebRequest extends CreateSocialUserCommand {}
export interface DeleteSocialUserWebRequest extends DeleteSocialUserCommand {}
export interface GetSocialUserWebRequest extends GetSocialUserQuery {}

// Relationships
export interface PostFollowUserWebRequest extends Partial<PostFollowUserCommand> {}
export interface DeleteFollowUserWebRequest extends Partial<DeleteFollowUserCommand> {}
export interface PostBlockUserWebRequest extends Partial<PostBlockUserCommand> {}
export interface DeleteBlockUserWebRequest extends Partial<DeleteBlockUserCommand> {}

export interface GetMyFollowsWebRequest extends Partial<GetMyFollowsQuery> {}
export interface GetMyFollowersWebRequest extends Partial<GetMyFollowersQuery> {}
export interface GetMyBlocksWebRequest extends Partial<GetMyBlocksQuery> {}
export interface GetWhoBlockedMeWebRequest extends Partial<GetWhoBlockedMeQuery> {}

// Posts
export interface CreateSocialPostWebRequest extends CreateSocialPostCommand {}
export interface DeleteSocialPostWebRequest extends DeleteSocialPostCommand {}
export interface PostUserOwnWebRequest extends Partial<PostUserOwnCommand> {}
export interface DeleteUserOwnWebRequest extends Partial<DeleteUserOwnCommand> {}

export interface GetSocialPostWebRequest extends GetSocialPostQuery {}
export interface GetUserPostsWebRequest extends Partial<GetUserPostsQuery> {}
export interface GetFeedWebRequest extends Partial<GetFeedQuery> {}

// Interactions
export interface PostLikePostWebRequest extends Partial<PostLikePostCommand> {}
export interface DeleteLikePostWebRequest extends Partial<DeleteLikePostCommand> {}

export interface GetUserLikesWebRequest extends Partial<GetUserLikesQuery> {}
export interface GetPostLikersWebRequest extends Partial<GetPostLikersQuery> {}

// Events
export interface CreateSocialEventWebRequest extends CreateSocialEventCommand {}
export interface DeleteSocialEventWebRequest extends DeleteSocialEventCommand {}
export interface PostUserEventWebRequest extends Partial<PostUserEventCommand> {}
export interface DeleteUserEventWebRequest extends Partial<DeleteUserEventCommand> {}
export interface PostUserParticipateEventWebRequest
  extends Partial<PostUserParticipateEventCommand> {}
export interface DeleteUserParticipateEventWebRequest
  extends Partial<DeleteUserParticipateEventCommand> {}

export interface GetUserEventWebRequest extends Partial<GetUserEventQuery> {}
export interface GetUserParticipateEventWebRequest extends Partial<GetUserParticipateEventQuery> {}
export interface GetEventParticipantsWebRequest extends Partial<GetEventParticipantsQuery> {}

// Event-Post links
export interface LinkPostToEventWebRequest extends Partial<LinkPostToEventCommand> {}
export interface UnlinkPostFromEventWebRequest extends Partial<UnlinkPostFromEventCommand> {}

export interface GetEventRelatedToPostWebRequest extends GetEventRelatedToPostQuery {}
export interface GetEventPostsWebRequest extends Partial<GetEventPostsQuery> {}
