import type { PaginationRequest } from '../../../index.js';

export interface CreateCommentRequest {
  content: string;
}
export interface ListCommentsRequest extends PaginationRequest {
  postId: string;
}
