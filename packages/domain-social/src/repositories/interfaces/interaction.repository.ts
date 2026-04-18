import type { PaginationRequest } from '@volontariapp/contracts';
import type { PaginatedIds } from '../../entities/paginated-ids.entity.js';

export interface IInteractionRepository {
  createLike(userId: string, postId: string): Promise<void>;
  deleteLike(userId: string, postId: string): Promise<void>;
  getUserLikes(userId: string, pagination: PaginationRequest): Promise<PaginatedIds>;
  getPostLikers(postId: string, pagination: PaginationRequest): Promise<PaginatedIds>;
  likeExists(userId: string, postId: string): Promise<boolean>;
}
