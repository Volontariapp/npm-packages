import type {
  DeleteUserResponse,
  ListUsersResponse,
  UserResponse,
  AuthResponse,
  LoginResponse,
  RefreshTokenResponse,
  SignUpResponse,
  UpdateUserResponse,
  IncrementImpactScoreResponse,
  CreateBadgeResponse,
  UpdateBadgeResponse,
  DeleteBadgeResponse,
  AddBadgeToUserResponse,
  RemoveBadgeFromUserResponse,
  BadgeResponse,
  ListBadgesResponse,
} from '../../../user/user.responses.js';

export interface UserWebResponse extends UserResponse {}

export interface ListUsersWebResponse extends ListUsersResponse {}

export interface GetUserWebResponse extends UserResponse {}

export interface DeleteUserWebResponse extends DeleteUserResponse {}

export interface UpdateUserWebResponse extends UpdateUserResponse {}

export interface AuthWebResponse extends AuthResponse {}

export interface LoginWebResponse extends LoginResponse {}

export interface RefreshTokenWebResponse extends RefreshTokenResponse {}

export interface SignUpWebResponse extends SignUpResponse {}

export interface IncrementImpactScoreWebResponse extends IncrementImpactScoreResponse {}

export interface CreateBadgeWebResponse extends CreateBadgeResponse {}

export interface UpdateBadgeWebResponse extends UpdateBadgeResponse {}

export interface DeleteBadgeWebResponse extends DeleteBadgeResponse {}

export interface AddBadgeToUserWebResponse extends AddBadgeToUserResponse {}

export interface RemoveBadgeFromUserWebResponse extends RemoveBadgeFromUserResponse {}

export interface BadgeWebResponse extends BadgeResponse {}

export interface ListBadgesWebResponse extends ListBadgesResponse {}
