export interface PaginationRequest {
  page?: number;
  limit?: number;
}

export interface PaginationResponse {
  totalItems: number;
  totalPages: number;
  currentPage: number;
  limit: number;
}

export interface Post {
  id: string;
  authorId: string;
  title: string;
  content: string;
}

export interface GetPostRequest {
  id: string;
}

export interface GetPostResponse {
  post: Post;
}

export interface ListPostsRequest {
  pagination?: PaginationRequest;
  authorId?: string;
}

export interface ListPostsResponse {
  posts: Post[];
  pagination?: PaginationResponse;
}

export interface CreatePostRequest {
  authorId: string;
  title: string;
  content: string;
}

export interface CreatePostResponse {
  post: Post;
}

export interface UpdatePostRequest {
  id: string;
  title?: string;
  content?: string;
}

export interface UpdatePostResponse {
  post: Post;
}

export interface DeletePostRequest {
  id: string;
}

export interface DeletePostResponse {
  success: boolean;
}
