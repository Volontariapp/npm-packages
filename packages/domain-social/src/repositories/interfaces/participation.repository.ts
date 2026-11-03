import type { SocialUserEntity } from '../../entities/social-user.entity.js';
import type { SocialEventEntity } from '../../entities/social-event.entity.js';
import type { PaginatedIdsVO } from '../../value-objects/paginated-ids.vo.js';
import type { PaginatedAttendeesVO } from '../../value-objects/paginated-attendees.vo.js';
import type { EventParticipantCountVO } from '../../value-objects/batch-results.vo.js';
import type { PaginationVO } from '../../value-objects/pagination.vo.js';

export interface IParticipationRepository {
  createEventNode(entity: SocialEventEntity): Promise<void>;
  deleteEventNode(entity: SocialEventEntity): Promise<void>;
  eventExists(entity: SocialEventEntity): Promise<boolean>;
  createEventsBatch(events: { eventId: string; organizerId: string }[]): Promise<void>;
  deleteEventsBatch(eventIds: string[]): Promise<void>;
  createUserEvent(user: SocialUserEntity, event: SocialEventEntity): Promise<void>;
  deleteUserEvent(user: SocialUserEntity, event: SocialEventEntity): Promise<void>;
  createParticipation(user: SocialUserEntity, event: SocialEventEntity): Promise<void>;
  deleteParticipation(user: SocialUserEntity, event: SocialEventEntity): Promise<void>;
  participationExists(user: SocialUserEntity, event: SocialEventEntity): Promise<boolean>;
  isEventCreator(user: SocialUserEntity, event: SocialEventEntity): Promise<boolean>;
  createWish(user: SocialUserEntity, event: SocialEventEntity): Promise<void>;
  deleteWish(user: SocialUserEntity, event: SocialEventEntity): Promise<void>;
  wishExists(user: SocialUserEntity, event: SocialEventEntity): Promise<boolean>;
  getUserEvents(user: SocialUserEntity, pagination: PaginationVO): Promise<PaginatedIdsVO>;
  getUserParticipations(user: SocialUserEntity, pagination: PaginationVO): Promise<PaginatedIdsVO>;
  getUserWishes(user: SocialUserEntity, pagination: PaginationVO): Promise<PaginatedIdsVO>;
  getEventParticipants(event: SocialEventEntity, pagination: PaginationVO): Promise<PaginatedIdsVO>;
  /**
   * Une seule requete: nombre de participants par evenement (meme definition que le total de
   * getEventParticipants). Ids dedoublonnes, vides ignores, plafonnes a MAX_SOCIAL_BATCH_IDS;
   * un evenement sans participant renvoie 0.
   */
  countParticipantsByEventIds(eventIds: string[]): Promise<EventParticipantCountVO[]>;
  setEventAttendance(
    eventId: string,
    checkedUserIds: string[],
    uncheckedUserIds: string[],
  ): Promise<void>;
  getEventAttendees(
    event: SocialEventEntity,
    pagination: PaginationVO,
  ): Promise<PaginatedAttendeesVO>;
  getRecommendedEventIds(
    userId: string,
    filters: {
      excludeCreatedByMe?: boolean;
      excludeBlockedUsers?: boolean;
      excludeParticipatedByMe?: boolean;
      excludeWishedByMe?: boolean;
      onlyParticipatedByFriends?: boolean;
      onlyWishedByFriends?: boolean;
      onlyCreatedByFriends?: boolean;
    },
    pagination: PaginationVO,
  ): Promise<PaginatedIdsVO>;
}
