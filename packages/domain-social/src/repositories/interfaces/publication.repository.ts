import type { PaginationRequest } from '@volontariapp/contracts';
import type { PaginatedIds } from '../../entities/paginated-ids.entity.js';

export interface IPublicationRepository {
  createPostNode(postId: string): Promise<void>;
  deletePostNode(postId: string): Promise<void>;
  postExists(postId: string): Promise<boolean>;
  createOwnership(userId: string, postId: string): Promise<void>;
  deleteOwnership(userId: string, postId: string): Promise<void>;
  getUserPosts(userId: string, pagination: PaginationRequest): Promise<PaginatedIds>;
  getFeed(userId: string, pagination: PaginationRequest): Promise<PaginatedIds>;
}
