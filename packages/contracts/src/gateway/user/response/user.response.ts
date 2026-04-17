import type { DeleteUserResponse, ListUsersResponse, UserResponse,
  AuthResponse, LoginResponse, RefreshTokenResponse, SignUpResponse,
  UpdateUserResponse
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
