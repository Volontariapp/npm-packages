import type {
  GetMyFollowsQuery,
  GetMyFollowersQuery,
  GetPostLikersQuery,
  GetEventParticipantsQuery,
  CreateBadgeCommand,
  UpdateBadgeCommand,
  DeleteBadgeCommand,
  SignUpCommand,
  UpdateUserCommand,
  DeleteUserCommand,
  AddBadgeToUserCommand,
  RemoveBadgeFromUserCommand,
  IncrementImpactScoreCommand,
} from '@volontariapp/contracts';

export enum UserJobType {
  SEND_WELCOME_EMAIL = 'user.send_welcome_email',
  RESET_PASSWORD = 'user.reset_password',
  FALLBACK_GET_MY_FOLLOWS = 'user.fallback_get_my_follows',
  FALLBACK_GET_MY_FOLLOWERS = 'user.fallback_get_my_followers',
  FALLBACK_GET_POST_LIKERS = 'user.fallback_get_post_likers',
  FALLBACK_GET_EVENT_PARTICIPANTS = 'user.fallback_get_event_participants',
  FALLBACK_CREATE_BADGE = 'user.fallback_create_badge',
  FALLBACK_UPDATE_BADGE = 'user.fallback_update_badge',
  FALLBACK_DELETE_BADGE = 'user.fallback_delete_badge',
  FALLBACK_SIGN_UP = 'user.fallback_sign_up',
  FALLBACK_UPDATE_USER = 'user.fallback_update_user',
  FALLBACK_DELETE_USER = 'user.fallback_delete_user',
  FALLBACK_ADD_BADGE_TO_USER = 'user.fallback_add_badge_to_user',
  FALLBACK_REMOVE_BADGE_FROM_USER = 'user.fallback_remove_badge_from_user',
  FALLBACK_INCREMENT_IMPACT_SCORE = 'user.fallback_increment_impact_score',
}

export interface ISendWelcomeEmailPayload {
  userId: string;
  email: string;
  firstName: string;
}

export interface IResetPasswordPayload {
  email: string;
  token: string;
}

export interface IUserFallbackJobPayload<T> {
  userId: string;
  payload: T;
}

export interface IFallbackGetMyFollowsJobPayload
  extends IUserFallbackJobPayload<GetMyFollowsQuery> {}
export interface IFallbackGetMyFollowersJobPayload
  extends IUserFallbackJobPayload<GetMyFollowersQuery> {}
export interface IFallbackGetPostLikersJobPayload
  extends IUserFallbackJobPayload<GetPostLikersQuery> {}
export interface IFallbackGetEventParticipantsJobPayload
  extends IUserFallbackJobPayload<GetEventParticipantsQuery> {}
export interface IFallbackCreateBadgeJobPayload
  extends IUserFallbackJobPayload<CreateBadgeCommand> {}
export interface IFallbackUpdateBadgeJobPayload
  extends IUserFallbackJobPayload<UpdateBadgeCommand> {}
export interface IFallbackDeleteBadgeJobPayload
  extends IUserFallbackJobPayload<DeleteBadgeCommand> {}
export interface IFallbackSignUpJobPayload extends IUserFallbackJobPayload<SignUpCommand> {}
export interface IFallbackUpdateUserJobPayload extends IUserFallbackJobPayload<UpdateUserCommand> {}
export interface IFallbackDeleteUserJobPayload extends IUserFallbackJobPayload<DeleteUserCommand> {}
export interface IFallbackAddBadgeToUserJobPayload
  extends IUserFallbackJobPayload<AddBadgeToUserCommand> {}
export interface IFallbackRemoveBadgeFromUserJobPayload
  extends IUserFallbackJobPayload<RemoveBadgeFromUserCommand> {}
export interface IFallbackIncrementImpactScoreJobPayload
  extends IUserFallbackJobPayload<IncrementImpactScoreCommand> {}
