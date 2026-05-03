import type { UpdateUserCommand, DeleteUserCommand } from '../../../user/user.command.js';
import type { GetUserQuery, ListUsersQuery } from '../../../user/user.query.js';

/**
 * Public request to get authenticated user profile.
 * userId comes from JWT.
 */
export interface GetUserRequest extends GetUserQuery {}

/**
 * Public request to update user profile.
 * userId comes from JWT.
 */
export interface UpdateUserRequest extends Partial<UpdateUserCommand> {}

/**
 * Public request to delete user account.
 * userId comes from JWT.
 */
export interface DeleteUserRequest extends DeleteUserCommand {}

/**
 * Public request to list users with pagination.
 */
export interface ListUsersRequest extends Partial<ListUsersQuery> {}
