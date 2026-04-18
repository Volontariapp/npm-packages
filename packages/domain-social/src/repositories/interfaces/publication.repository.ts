import type { SocialUserEntity } from '../../entities/social-user.entity.js';
import type { SocialPostEntity } from '../../entities/social-post.entity.js';
import type { PaginatedIdsVO } from '../../value-objects/paginated-ids.vo.js';
import type { PaginationVO } from '../../value-objects/pagination.vo.js';

export interface IPublicationRepository {
  createPostNode(post: SocialPostEntity): Promise<void>;
  deletePostNode(post: SocialPostEntity): Promise<void>;
  postExists(post: SocialPostEntity): Promise<boolean>;
  createOwnership(user: SocialUserEntity, post: SocialPostEntity): Promise<void>;
  deleteOwnership(user: SocialUserEntity, post: SocialPostEntity): Promise<void>;
  getUserPosts(user: SocialUserEntity, pagination: PaginationVO): Promise<PaginatedIdsVO>;
  getFeed(user: SocialUserEntity, pagination: PaginationVO): Promise<PaginatedIdsVO>;
}
