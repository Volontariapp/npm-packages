import type { PaginationResponse } from '../../../common/index.js';

export interface CommentWebResponse {
  id: string;
  postId: string;
  authorId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface ListCommentsWebResponse extends PaginationResponse {
  comments: CommentWebResponse[];
  totalCount: number;
}
