import type { CreateUserCommand, UpdateUserCommand } from '../../../user/user.command.js';
import type { ListUsersQuery } from '../../../user/user.query.js';

/**
 * Public request to register a new user.
 */
export interface CreateUserRequest extends CreateUserCommand {}

/**
 * Public request to update user profile.
 * REST-friendly: flatten fields from UpdateUserCommand.
 */
export interface UpdateUserRequest extends Partial<Omit<UpdateUserCommand, 'id'>> {}

/**
 * Public request to list users with pagination.
 */
export interface ListUsersRequest extends Partial<ListUsersQuery> {}
