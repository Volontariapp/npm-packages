import type { SocialUserEntity } from '../../entities/social-user.entity.js';
import type { SocialEventEntity } from '../../entities/social-event.entity.js';
import type { PaginatedIdsVO } from '../../value-objects/paginated-ids.vo.js';
import type { PaginationVO } from '../../value-objects/pagination.vo.js';

export interface IParticipationRepository {
  createEventNode(entity: SocialEventEntity): Promise<void>;
  deleteEventNode(entity: SocialEventEntity): Promise<void>;
  eventExists(entity: SocialEventEntity): Promise<boolean>;
  createUserEvent(user: SocialUserEntity, event: SocialEventEntity): Promise<void>;
  deleteUserEvent(user: SocialUserEntity, event: SocialEventEntity): Promise<void>;
  createParticipation(user: SocialUserEntity, event: SocialEventEntity): Promise<void>;
  deleteParticipation(user: SocialUserEntity, event: SocialEventEntity): Promise<void>;
  participationExists(user: SocialUserEntity, event: SocialEventEntity): Promise<boolean>;
  getUserEvents(user: SocialUserEntity, pagination: PaginationVO): Promise<PaginatedIdsVO>;
  getUserParticipations(user: SocialUserEntity, pagination: PaginationVO): Promise<PaginatedIdsVO>;
  getEventParticipants(event: SocialEventEntity, pagination: PaginationVO): Promise<PaginatedIdsVO>;
}
