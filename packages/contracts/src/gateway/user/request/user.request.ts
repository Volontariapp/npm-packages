import type {
  DeleteUserCommand,
  LoginCommand,
  RefreshTokenCommand,
  SignUpCommand,
  UpdateUserCommand,
} from '../../../user/user.command.js';
import type { GetUserQuery, ListUsersQuery } from '../../../user/user.query.js';

/**
 * Public request to register a new user.
 */
export interface SignUpRequest extends SignUpCommand {}

/**
 * Public request to update user profile.
 * REST-friendly: flatten fields from UpdateUserCommand.
 */
export interface UpdateUserRequest extends Partial<Omit<UpdateUserCommand, 'id'>> {}

/**
 * Public request to list users with pagination.
 */
export interface ListUsersRequest extends Partial<ListUsersQuery> {}

export interface GetUserRequest extends GetUserQuery {}

export interface DeleteUserRequest extends DeleteUserCommand {}

export interface LoginRequest extends LoginCommand {}

export interface RefreshTokenRequest extends RefreshTokenCommand {}
