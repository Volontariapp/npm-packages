import type { AdminUpdateUserCommand, AdminDeleteUserCommand } from '../../../user/user.command.js';
import type { AdminGetUserQuery } from '../../../user/user.query.js';

/**
 * Admin request to get a user profile by ID.
 * userId comes from @Param(:userId).
 */
export interface AdminGetUserRequest extends Omit<AdminGetUserQuery, 'userId'> {}

/**
 * Admin request to update any user profile.
 * userId comes from @Param(:userId).
 */
export interface AdminUpdateUserRequest extends Omit<AdminUpdateUserCommand, 'userId'> {}

/**
 * Admin request to delete any user account.
 * userId comes from @Param(:userId).
 */
export interface AdminDeleteUserRequest extends Omit<AdminDeleteUserCommand, 'userId'> {}
