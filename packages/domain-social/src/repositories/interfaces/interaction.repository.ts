import type { SocialUserEntity } from '../../entities/social-user.entity.js';
import type { SocialPostEntity } from '../../entities/social-post.entity.js';
import type { PaginatedIdsVO } from '../../value-objects/paginated-ids.vo.js';
import type { PaginationVO } from '../../value-objects/pagination.vo.js';

export interface IInteractionRepository {
  createLike(user: SocialUserEntity, post: SocialPostEntity): Promise<void>;
  deleteLike(user: SocialUserEntity, post: SocialPostEntity): Promise<void>;
  getUserLikes(user: SocialUserEntity, pagination: PaginationVO): Promise<PaginatedIdsVO>;
  getPostLikers(post: SocialPostEntity, pagination: PaginationVO): Promise<PaginatedIdsVO>;
  likeExists(user: SocialUserEntity, post: SocialPostEntity): Promise<boolean>;
}
