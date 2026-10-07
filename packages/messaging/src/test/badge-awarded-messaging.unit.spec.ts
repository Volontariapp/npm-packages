import { describe, expect, it } from '@jest/globals';
import {
  EventMessagingType,
  UserEventMessagingType,
  UserWebsocketMessagingType,
  WebsocketMessagingType,
  USER_EVENT_TO_WS_EVENT_MAPPING,
} from '../index.js';
import type { EventRegistry, WebsocketEventRegistry } from '../index.js';
import {
  buildBadgePayload,
  buildUserBadgeAwardedPayload,
} from './badge-awarded-messaging.factory.js';

describe('Badge awarded messaging contracts', () => {
  describe('constants and mappings', () => {
    it('should expose USER_BADGE_AWARDED in UserEventMessagingType and EventMessagingType', () => {
      expect(UserEventMessagingType.USER_BADGE_AWARDED).toBe('user.badge_awarded');
      expect(EventMessagingType.USER_BADGE_AWARDED).toBe('user.badge_awarded');
    });

    it('should expose USER_BADGE_AWARDED in UserWebsocketMessagingType and WebsocketMessagingType', () => {
      expect(UserWebsocketMessagingType.USER_BADGE_AWARDED).toBe('user.badge_awarded');
      expect(WebsocketMessagingType.USER_BADGE_AWARDED).toBe('user.badge_awarded');
    });

    it('should correctly map user event to websocket event', () => {
      expect(USER_EVENT_TO_WS_EVENT_MAPPING[UserEventMessagingType.USER_BADGE_AWARDED]).toBe(
        UserWebsocketMessagingType.USER_BADGE_AWARDED,
      );
    });
  });

  describe('typing and registry', () => {
    it('should correctly type EventRegistry[UserEventMessagingType.USER_BADGE_AWARDED]', () => {
      const payload: EventRegistry[UserEventMessagingType.USER_BADGE_AWARDED] =
        buildUserBadgeAwardedPayload();

      expect(payload.userId).toBe('user-456');
      expect(payload.badges).toHaveLength(1);
      expect(payload.badges[0].slug).toBe('EVENT_HOST_COUNT_1');
    });

    it('should correctly type WebsocketEventRegistry[UserWebsocketMessagingType.USER_BADGE_AWARDED]', () => {
      const wsPayload: WebsocketEventRegistry[UserWebsocketMessagingType.USER_BADGE_AWARDED] = {
        badges: [buildBadgePayload()],
      };

      expect(wsPayload.badges).toHaveLength(1);
      expect(wsPayload.badges[0].name).toBe('Bâtisseur·se');
    });
  });
});
