import { describe, expect, it } from '@jest/globals';
import { EventEventMessagingType, EventMessagingType, UserEventMessagingType } from '../index.js';
import type {
  EventRegistry,
  PostEventMessagingType,
  IFallbackCreateBadgeJobPayload,
  IFallbackCreateEventJobPayload,
} from '../index.js';
import {
  buildBadgeCreatedPayload,
  buildBadgeDeletedPayload,
  buildBadgeIconReplacedPayload,
  buildEventCoverReplacedPayload,
  buildEventCreatedPayload,
  buildPostCreatedPayload,
  buildUserAvatarReplacedPayload,
} from './file-events-messaging.factory.js';

describe('File related event payloads', () => {
  describe('names', () => {
    it('should expose the new event types', () => {
      expect(EventEventMessagingType.EVENT_COVER_REPLACED).toBe('event.cover_replaced');
      expect(UserEventMessagingType.USER_AVATAR_REPLACED).toBe('user.avatar_replaced');
      expect(UserEventMessagingType.USER_BADGE_CREATED).toBe('user.badge_created');
      expect(UserEventMessagingType.USER_BADGE_ICON_REPLACED).toBe('user.badge_icon_replaced');
      expect(UserEventMessagingType.USER_BADGE_DELETED).toBe('user.badge_deleted');
    });

    it('should aggregate them in EventMessagingType', () => {
      expect(EventMessagingType.EVENT_COVER_REPLACED).toBe('event.cover_replaced');
      expect(EventMessagingType.USER_AVATAR_REPLACED).toBe('user.avatar_replaced');
    });
  });

  describe('typing', () => {
    it('should type post.created with fileIds and a mandatory userId', () => {
      const payload: EventRegistry[PostEventMessagingType.POST_CREATED] = buildPostCreatedPayload();
      expect(payload.fileIds).toEqual(['file-1']);
      expect(payload.userId).toBe('user-1');

      // @ts-expect-error userId is mandatory
      const withoutUser: EventRegistry[PostEventMessagingType.POST_CREATED] = {
        postId: 'post-1',
        fileIds: [],
      };
      // @ts-expect-error fileIds is mandatory
      const withoutFiles: EventRegistry[PostEventMessagingType.POST_CREATED] = {
        postId: 'post-1',
        userId: 'user-1',
      };
      expect([withoutUser, withoutFiles]).toHaveLength(2);
    });

    it('should type event.created with a mandatory userId and an optional coverFileId', () => {
      const withoutCover: EventRegistry[EventEventMessagingType.EVENT_CREATED] =
        buildEventCreatedPayload();
      const withCover = buildEventCreatedPayload({ coverFileId: 'file-9' });
      expect(withoutCover.coverFileId).toBeUndefined();
      expect(withCover.coverFileId).toBe('file-9');

      // @ts-expect-error userId is mandatory
      const withoutUser: EventRegistry[EventEventMessagingType.EVENT_CREATED] = {
        eventId: 'event-1',
        localisationName: 'Paris',
      };
      expect(withoutUser.eventId).toBe('event-1');
    });

    it('should type event.cover_replaced with optional file ids', () => {
      const payload: EventRegistry[EventEventMessagingType.EVENT_COVER_REPLACED] =
        buildEventCoverReplacedPayload({ oldFileId: undefined });
      expect(payload.newFileId).toBe('file-2');
      expect(payload.oldFileId).toBeUndefined();
    });

    it('should type user.avatar_replaced and the badge events', () => {
      const avatar: EventRegistry[UserEventMessagingType.USER_AVATAR_REPLACED] =
        buildUserAvatarReplacedPayload({ newFileId: undefined });
      expect(avatar.oldFileId).toBe('file-1');
      const created: EventRegistry[UserEventMessagingType.USER_BADGE_CREATED] =
        buildBadgeCreatedPayload();
      const replaced: EventRegistry[UserEventMessagingType.USER_BADGE_ICON_REPLACED] =
        buildBadgeIconReplacedPayload();
      const deleted: EventRegistry[UserEventMessagingType.USER_BADGE_DELETED] =
        buildBadgeDeletedPayload();
      expect([created.badgeId, replaced.badgeId, deleted.badgeId]).toEqual([
        'badge-1',
        'badge-1',
        'badge-1',
      ]);
    });

    it('should require the computed entity id in the creation fallback payloads', () => {
      type EventFallback = Pick<IFallbackCreateEventJobPayload, 'eventId'>;
      type BadgeFallback = Pick<IFallbackCreateBadgeJobPayload, 'badgeId'>;
      const event: EventFallback = { eventId: 'event-1' };
      const badge: BadgeFallback = { badgeId: 'badge-1' };
      expect(event.eventId).toBe('event-1');
      expect(badge.badgeId).toBe('badge-1');
    });
  });
});
