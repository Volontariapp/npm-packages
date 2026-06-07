import type { CreatePostResponse, AdminCreatePostResponse } from '../../../post/post.responses.js';

export interface PostWeb {
  id: string;
  authorId: string;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PostWebResponse {
  post: PostWeb;
}

export interface ListPostsWebResponse {
  posts: PostWeb[];
  totalCount: number;
}

// Self-service create response
export interface CreatePostWebResponse extends CreatePostResponse {}

// Admin create response
export interface AdminCreatePostWebResponse extends AdminCreatePostResponse {}
