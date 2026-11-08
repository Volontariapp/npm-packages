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
  GetMyBadgeProgressResponse,
  GetLeaderboardResponse,
  GetMyRankResponse,
} from '../../../user/user.responses.js';
import type {
  User,
  Badge,
  BadgeProgress,
  UserPublic,
  LeaderboardEntry,
} from '../../../user/user.js';

export interface BadgeWeb extends Omit<Badge, 'awardedAt'> {
  awardedAt?: Date;
}

/** Progress of the caller towards one badge. `awardedAt` is a Date for REST clients. */
export interface BadgeProgressWeb extends Omit<BadgeProgress, 'awardedAt'> {
  awardedAt?: Date;
}

export interface UserWeb extends Omit<User, 'badges'> {
  badges: BadgeWeb[];
  /** Public URL of the avatar, computed by the gateway from avatarFileId. Absent when there is none. */
  avatarUrl?: string;
}

export interface UserPublicWeb extends Omit<UserPublic, 'badges'> {
  badges: BadgeWeb[];
  /** Public URL of the avatar, computed by the gateway from avatarFileId. Absent when there is none. */
  avatarUrl?: string;
}

export interface UserWebResponse {
  user: UserWeb | undefined;
}

export interface PublicUserWebResponse {
  user: UserPublicWeb | undefined;
}

export interface ListUsersWebResponse extends Omit<ListUsersResponse, 'users'> {
  users: UserWeb[];
}

export interface GetUsersByIdsWebResponse extends Omit<ListUsersResponse, 'users'> {
  users: UserWeb[];
}

export interface GetMyFollowsProfilesWebResponse extends Omit<
  GetMyFollowsProfilesResponse,
  'users'
> {
  users: UserWeb[];
}

export interface GetMyFollowersProfilesWebResponse extends Omit<
  GetMyFollowersProfilesResponse,
  'users'
> {
  users: UserWeb[];
}

export interface GetEventParticipantsProfilesWebResponse extends Omit<
  GetEventParticipantsProfilesResponse,
  'users'
> {
  users: UserPublicWeb[];
}

export interface GetPostLikersProfilesWebResponse extends Omit<
  GetPostLikersProfilesResponse,
  'users'
> {
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

export interface GetMyBadgeProgressWebResponse extends Omit<GetMyBadgeProgressResponse, 'badges'> {
  badges: BadgeProgressWeb[];
}

/** One ranked user. `avatarUrl` is computed by the gateway from `avatarFileId`. Absent when there is none. */
export interface LeaderboardEntryWeb extends LeaderboardEntry {
  avatarUrl?: string;
}

export interface GetLeaderboardWebResponse extends Omit<GetLeaderboardResponse, 'entries'> {
  entries: LeaderboardEntryWeb[];
}

export interface GetMyRankWebResponse extends Omit<GetMyRankResponse, 'me' | 'neighbors'> {
  /** Absent when the caller has no rank on this scope yet. */
  me?: LeaderboardEntryWeb;
  /** Up to 5 entries above and 5 below the caller, ordered by rank. */
  neighbors: LeaderboardEntryWeb[];
}
