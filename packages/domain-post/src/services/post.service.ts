import type {
  GetPostRequest,
  GetPostResponse,
  ListPostsRequest,
  ListPostsResponse,
  CreatePostRequest,
  CreatePostResponse,
  UpdatePostRequest,
  UpdatePostResponse,
  DeletePostRequest,
  DeletePostResponse,
} from '../contracts';

export interface IPostService {
  getPost(request: GetPostRequest): Promise<GetPostResponse>;
  listPosts(request: ListPostsRequest): Promise<ListPostsResponse>;
  createPost(request: CreatePostRequest): Promise<CreatePostResponse>;
  updatePost(request: UpdatePostRequest): Promise<UpdatePostResponse>;
  deletePost(request: DeletePostRequest): Promise<DeletePostResponse>;
}
