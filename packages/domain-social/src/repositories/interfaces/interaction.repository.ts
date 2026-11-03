import type { SocialUserEntity } from '../../entities/social-user.entity.js';
import type { SocialPostEntity } from '../../entities/social-post.entity.js';
import type { PaginatedIdsVO } from '../../value-objects/paginated-ids.vo.js';
import type { PostLikeSummaryVO } from '../../value-objects/batch-results.vo.js';
import type { PaginationVO } from '../../value-objects/pagination.vo.js';

export interface IInteractionRepository {
  createLike(user: SocialUserEntity, post: SocialPostEntity): Promise<void>;
  deleteLike(user: SocialUserEntity, post: SocialPostEntity): Promise<void>;
  getUserLikes(user: SocialUserEntity, pagination: PaginationVO): Promise<PaginatedIdsVO>;
  getPostLikers(post: SocialPostEntity, pagination: PaginationVO): Promise<PaginatedIdsVO>;
  /**
   * Une seule requete pour tous les posts: like_count et liked_by_me. Ids dedoublonnes,
   * vides ignores, plafonnes a MAX_SOCIAL_BATCH_IDS; un post sans like renvoie 0 / false.
   */
  getPostsLikeSummary(userId: string, postIds: string[]): Promise<PostLikeSummaryVO[]>;
  likeExists(user: SocialUserEntity, post: SocialPostEntity): Promise<boolean>;
}
