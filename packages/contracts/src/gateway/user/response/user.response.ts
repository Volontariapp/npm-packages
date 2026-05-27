import type {
  DeleteUserResponse,
  ListUsersResponse,
  AuthResponse,
  LoginResponse,
  RefreshTokenResponse,
  SignUpResponse,
  UpdateUserResponse,
  AdminUpdateUserResponse,
  AdminDeleteUserResponse,
  IncrementImpactScoreResponse,
  CreateBadgeResponse,
  UpdateBadgeResponse,
  DeleteBadgeResponse,
  AddBadgeToUserResponse,
  RemoveBadgeFromUserResponse,
  ListBadgesResponse,
  GetMyFollowsProfilesResponse,
  GetMyFollowersProfilesResponse,
  GetEventParticipantsProfilesResponse,
  GetPostLikersProfilesResponse,
} from '../../../user/user.responses.js';
import type { User, Badge, UserPublic } from '../../../user/user.js';

export interface BadgeWeb extends Omit<Badge, 'awardedAt'> {
  awardedAt?: Date;
}

export interface UserWeb extends Omit<User, 'badges'> {
  badges: BadgeWeb[];
}

export interface UserPublicWeb extends Omit<UserPublic, 'badges'> {
  badges: BadgeWeb[];
}

export interface UserWebResponse {
  user: UserWeb | undefined;
}

export interface ListUsersWebResponse extends Omit<ListUsersResponse, 'users'> {
  users: UserWeb[];
}

export interface GetUsersByIdsWebResponse extends Omit<ListUsersResponse, 'users'> {
  users: UserWeb[];
}

export interface GetMyFollowsProfilesWebResponse
  extends Omit<GetMyFollowsProfilesResponse, 'users'> {
  users: UserWeb[];
}

export interface GetMyFollowersProfilesWebResponse
  extends Omit<GetMyFollowersProfilesResponse, 'users'> {
  users: UserWeb[];
}

export interface GetEventParticipantsProfilesWebResponse
  extends Omit<GetEventParticipantsProfilesResponse, 'users'> {
  users: UserPublicWeb[];
}

export interface GetPostLikersProfilesWebResponse
  extends Omit<GetPostLikersProfilesResponse, 'users'> {
  users: UserPublicWeb[];
}

// Self-service
export interface GetUserWebResponse extends UserWebResponse {}

export interface DeleteUserWebResponse extends DeleteUserResponse {}

export interface UpdateUserWebResponse extends UpdateUserResponse {}

// Admin variants
export interface AdminGetUserWebResponse extends UserWebResponse {}

export interface AdminDeleteUserWebResponse extends AdminDeleteUserResponse {}

export interface AdminUpdateUserWebResponse extends AdminUpdateUserResponse {}

// Authentication
export interface AuthWebResponse extends AuthResponse {}

export interface LoginWebResponse extends LoginResponse {}

export interface RefreshTokenWebResponse extends RefreshTokenResponse {}

export interface SignUpWebResponse extends Omit<SignUpResponse, 'user'> {
  user: UserWeb | undefined;
}

// Impact score
export interface IncrementImpactScoreWebResponse extends IncrementImpactScoreResponse {}

// Badge management
export interface CreateBadgeWebResponse extends Omit<CreateBadgeResponse, 'badge'> {
  badge: BadgeWeb | undefined;
}

export interface UpdateBadgeWebResponse extends UpdateBadgeResponse {}

export interface DeleteBadgeWebResponse extends DeleteBadgeResponse {}

export interface AddBadgeToUserWebResponse extends AddBadgeToUserResponse {}

export interface RemoveBadgeFromUserWebResponse extends RemoveBadgeFromUserResponse {}

export interface BadgeWebResponse {
  badge: BadgeWeb | undefined;
}

export interface ListBadgesWebResponse extends Omit<ListBadgesResponse, 'badges'> {
  badges: BadgeWeb[];
}
