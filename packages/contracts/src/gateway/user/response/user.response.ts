import type { User } from '../../../user/user.js';
import type { PaginationResponse } from '../../../common/pagination.js';

export interface UserWebResponse {
  user: User;
}

export interface ListUsersWebResponse {
  users: User[];
  pagination: PaginationResponse;
}

export interface GetUserWebResponse {
  user: User;
}

export interface DeleteUserWebResponse {
}

export interface UpdateUserWebResponse {
}

export interface AuthWebResponse {
  accessToken: string;
  refreshToken: string;
}

export interface LoginWebResponse {
  auth: AuthWebResponse;
}

export interface RefreshTokenWebResponse {
  auth: AuthWebResponse;
}

export interface SignUpWebResponse {
  user: User;
  auth: AuthWebResponse;
}
