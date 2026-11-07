import { describe, expect, it } from '@jest/globals';
import {
  LiveClientMessageType,
  LiveWebsocketMessagingType,
  WebsocketMessagingType,
} from '../index.js';
import type {
  ILiveGrantRequest,
  ILiveParticipantPosition,
  ILivePositionClientPayload,
  ILiveRevokeRequest,
  LiveClientMessageRegistry,
  LiveSharingStopReason,
  WebsocketEventRegistry,
} from '../index.js';

describe('Live websocket messaging contracts', () => {
  describe('constants', () => {
    it('should expose the server to client types in LiveWebsocketMessagingType', () => {
      expect(LiveWebsocketMessagingType.LIVE_POSITIONS_UPDATED).toBe('live.positions_updated');
      expect(LiveWebsocketMessagingType.LIVE_SHARING_STOPPED).toBe('live.sharing_stopped');
    });

    it('should expose the server to client types in WebsocketMessagingType', () => {
      expect(WebsocketMessagingType.LIVE_POSITIONS_UPDATED).toBe('live.positions_updated');
      expect(WebsocketMessagingType.LIVE_SHARING_STOPPED).toBe('live.sharing_stopped');
    });

    it('should expose the client to server type in LiveClientMessageType only', () => {
      expect(LiveClientMessageType.LIVE_POSITION).toBe('live.position');
      expect(Object.values(WebsocketMessagingType)).not.toContain(
        LiveClientMessageType.LIVE_POSITION,
      );
    });
  });

  describe('typing and registries', () => {
    it('should type WebsocketEventRegistry[LIVE_POSITIONS_UPDATED]', () => {
      const position: ILiveParticipantPosition = {
        userId: 'user-1',
        latitude: 48.857,
        longitude: 2.352,
        updatedAt: '2026-11-07T10:00:00.000Z',
      };
      const payload: WebsocketEventRegistry[LiveWebsocketMessagingType.LIVE_POSITIONS_UPDATED] = {
        eventId: 'event-1',
        positions: [position],
      };

      expect(payload.positions).toHaveLength(1);
      expect(payload.positions[0]?.userId).toBe('user-1');
    });

    it('should type WebsocketEventRegistry[LIVE_SHARING_STOPPED] for every stop reason', () => {
      const reasons: LiveSharingStopReason[] = [
        'ARRIVED',
        'STOPPED',
        'EVENT_ENDED',
        'LEFT',
        'REVOKED',
        'EXPIRED',
      ];

      const payloads = reasons.map(
        (reason): WebsocketEventRegistry[LiveWebsocketMessagingType.LIVE_SHARING_STOPPED] => ({
          eventId: 'event-1',
          userId: 'user-1',
          reason,
        }),
      );

      expect(payloads.map((payload) => payload.reason)).toEqual(reasons);
    });

    it('should type LiveClientMessageRegistry[LIVE_POSITION]', () => {
      const payload: LiveClientMessageRegistry[LiveClientMessageType.LIVE_POSITION] = {
        eventId: 'event-1',
        latitude: 48.857,
        longitude: 2.352,
      };
      const same: ILivePositionClientPayload = payload;

      expect(same.eventId).toBe('event-1');
    });

    it('should type the internal gateway to ws-service requests', () => {
      const grant: ILiveGrantRequest = {
        eventId: 'event-1',
        userId: 'user-1',
        organizerId: 'user-2',
        eventLatitude: 48.857,
        eventLongitude: 2.352,
        expiresAt: '2026-11-07T20:15:00.000Z',
      };
      const revoke: ILiveRevokeRequest = {
        eventId: grant.eventId,
        userId: grant.userId,
        reason: 'ARRIVED',
      };

      expect(revoke.reason).toBe('ARRIVED');
      expect(grant.organizerId).toBe('user-2');
    });
  });
});
