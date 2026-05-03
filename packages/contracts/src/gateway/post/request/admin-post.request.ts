import type { AdminCreatePostCommand } from '../../../post/post.command.js';

/**
 * Admin request to create a post on behalf of a user.
 * authorId comes from @Param(:userId).
 */
export interface AdminCreatePostRequest extends Omit<AdminCreatePostCommand, 'authorId'> {}
