import { describe, expect, it } from '@jest/globals';
import { Streams } from '@volontariapp/shared';
import {
  EventMessagingType,
  UserEventMessagingType,
  UserWebsocketMessagingType,
  WebsocketMessagingType,
  USER_EVENT_TO_WS_EVENT_MAPPING,
} from '../index.js';
import type { EventRegistry, WebsocketEventRegistry } from '../index.js';
import { buildUserImpactScoreCreditedPayload } from './impact-score-credited-messaging.factory.js';

describe('Impact score credited messaging contracts', () => {
  describe('constants and mappings', () => {
    it('should expose USER_IMPACT_SCORE_CREDITED in UserEventMessagingType and EventMessagingType', () => {
      expect(UserEventMessagingType.USER_IMPACT_SCORE_CREDITED).toBe('user.impact_score_credited');
      expect(EventMessagingType.USER_IMPACT_SCORE_CREDITED).toBe('user.impact_score_credited');
    });

    it('should expose USER_IMPACT_SCORE_CREDITED in UserWebsocketMessagingType and WebsocketMessagingType', () => {
      expect(UserWebsocketMessagingType.USER_IMPACT_SCORE_CREDITED).toBe(
        'user.impact_score_credited',
      );
      expect(WebsocketMessagingType.USER_IMPACT_SCORE_CREDITED).toBe('user.impact_score_credited');
    });

    it('should correctly map user event to websocket event', () => {
      expect(
        USER_EVENT_TO_WS_EVENT_MAPPING[UserEventMessagingType.USER_IMPACT_SCORE_CREDITED],
      ).toBe(UserWebsocketMessagingType.USER_IMPACT_SCORE_CREDITED);
    });

    it('should expose a dedicated Redis stream', () => {
      expect(Streams.USER_IMPACT_SCORE_CREDITED).toBe('user:impact_score_credited');
    });
  });

  describe('typing and registry', () => {
    it('should correctly type EventRegistry[UserEventMessagingType.USER_IMPACT_SCORE_CREDITED]', () => {
      const payload: EventRegistry[UserEventMessagingType.USER_IMPACT_SCORE_CREDITED] =
        buildUserImpactScoreCreditedPayload();

      expect(payload.userId).toBe('user-456');
      expect(payload.eventId).toBe('event-789');
      expect(payload.scoreIncrement).toBe(40);
    });

    it('should correctly type WebsocketEventRegistry[UserWebsocketMessagingType.USER_IMPACT_SCORE_CREDITED]', () => {
      const wsPayload: WebsocketEventRegistry[UserWebsocketMessagingType.USER_IMPACT_SCORE_CREDITED] =
        { eventId: 'event-789', scoreIncrement: 40 };

      expect(wsPayload.eventId).toBe('event-789');
      expect(wsPayload.scoreIncrement).toBe(40);
    });
  });
});
