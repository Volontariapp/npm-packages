import type { Post } from '../../../post/post.js';

export interface PostWebResponse {
  post: Post;
}

export interface ListPostsWebResponse {
  posts: Post[];
  totalCount: number;
}
