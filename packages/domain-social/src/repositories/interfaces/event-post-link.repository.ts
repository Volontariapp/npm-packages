import type { PaginationRequest } from '@volontariapp/contracts';
import type { PaginatedIds } from '../../entities/paginated-ids.entity.js';

export interface IEventPostLinkRepository {
  linkPostToEvent(postId: string, eventId: string): Promise<void>;
  unlinkPostFromEvent(postId: string, eventId: string): Promise<void>;
  getEventRelatedToPost(postId: string): Promise<string | null>;
  getEventPosts(eventId: string, pagination: PaginationRequest): Promise<PaginatedIds>;
}
