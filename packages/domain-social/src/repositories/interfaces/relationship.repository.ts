import type { SocialUserEntity } from '../../entities/social-user.entity.js';
import type { PaginatedIdsVO } from '../../value-objects/paginated-ids.vo.js';
import type { PaginationVO } from '../../value-objects/pagination.vo.js';

export interface IRelationshipRepository {
  createFollow(follower: SocialUserEntity, followed: SocialUserEntity): Promise<void>;
  deleteFollow(follower: SocialUserEntity, followed: SocialUserEntity): Promise<void>;
  createBlock(blocker: SocialUserEntity, blocked: SocialUserEntity): Promise<void>;
  deleteBlock(blocker: SocialUserEntity, blocked: SocialUserEntity): Promise<void>;
  getFollows(user: SocialUserEntity, pagination: PaginationVO): Promise<PaginatedIdsVO>;
  getFollowers(user: SocialUserEntity, pagination: PaginationVO): Promise<PaginatedIdsVO>;
  getBlocks(user: SocialUserEntity, pagination: PaginationVO): Promise<PaginatedIdsVO>;
  getWhoBlockedMe(user: SocialUserEntity, pagination: PaginationVO): Promise<PaginatedIdsVO>;
  relationshipExists(from: SocialUserEntity, to: SocialUserEntity, type: string): Promise<boolean>;
}
