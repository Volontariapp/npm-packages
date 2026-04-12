import type { CreatePostCommand, UpdatePostCommand } from '../../../post/post.command.js';
import type { ListPostsQuery } from '../../../post/post.query.js';

/**
 * Public request to create a community post.
 */
export interface CreatePostRequest extends CreatePostCommand {}

/**
 * Public request to update a post.
 * REST-friendly: flatten fields from UpdatePostCommand.
 */
export interface UpdatePostRequest extends Partial<Omit<UpdatePostCommand, 'id'>> {}

/**
 * Public request to list posts with pagination and filters.
 */
export interface ListPostsRequest extends Partial<ListPostsQuery> {}
