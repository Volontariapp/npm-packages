import type { SocialPostEntity } from '../../entities/social-post.entity.js';
import type { SocialEventEntity } from '../../entities/social-event.entity.js';
import type { PaginatedIdsVO } from '../../value-objects/paginated-ids.vo.js';
import type { PaginationVO } from '../../value-objects/pagination.vo.js';

export interface IEventPostLinkRepository {
  linkPostToEvent(post: SocialPostEntity, event: SocialEventEntity): Promise<void>;
  unlinkPostFromEvent(post: SocialPostEntity, event: SocialEventEntity): Promise<void>;
  getEventRelatedToPost(post: SocialPostEntity): Promise<string | null>;
  getEventPosts(event: SocialEventEntity, pagination: PaginationVO): Promise<PaginatedIdsVO>;
}
