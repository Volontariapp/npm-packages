import type { Post } from '../../../post/post.js';
import type { CreatePostResponse, AdminCreatePostResponse } from '../../../post/post.responses.js';

export interface PostWebResponse {
  post: Post;
}

export interface ListPostsWebResponse {
  posts: Post[];
  totalCount: number;
}

// Self-service create response
export interface CreatePostWebResponse extends CreatePostResponse {}

// Admin create response
export interface AdminCreatePostWebResponse extends AdminCreatePostResponse {}
