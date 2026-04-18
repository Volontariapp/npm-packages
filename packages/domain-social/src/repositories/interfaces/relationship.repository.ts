import type { PaginationRequest } from '@volontariapp/contracts';
import type { PaginatedIds } from '../../entities/paginated-ids.entity.js';

export interface IRelationshipRepository {
  createFollow(followerId: string, followedId: string): Promise<void>;
  deleteFollow(followerId: string, followedId: string): Promise<void>;
  createBlock(blockerId: string, blockedId: string): Promise<void>;
  deleteBlock(blockerId: string, blockedId: string): Promise<void>;
  getFollows(userId: string, pagination: PaginationRequest): Promise<PaginatedIds>;
  getFollowers(userId: string, pagination: PaginationRequest): Promise<PaginatedIds>;
  getBlocks(userId: string, pagination: PaginationRequest): Promise<PaginatedIds>;
  getWhoBlockedMe(userId: string, pagination: PaginationRequest): Promise<PaginatedIds>;
}
