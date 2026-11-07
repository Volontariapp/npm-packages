import { describe, expect, it } from '@jest/globals';
import {
  EventMessagingType,
  EventWebsocketMessagingType,
  SocialEventMessagingType,
  WebsocketMessagingType,
} from '../index.js';
import type { EventRegistry, WebsocketEventRegistry } from '../index.js';
import { buildAttendanceSetPayload } from './attendance-messaging.factory.js';

describe('Attendance messaging contracts', () => {
  it('should expose EVENT_SOCIAL_ATTENDANCE_SET in SocialEventMessagingType and EventMessagingType', () => {
    expect(SocialEventMessagingType.EVENT_SOCIAL_ATTENDANCE_SET).toBe(
      'event_social.attendance_set',
    );
    expect(EventMessagingType.EVENT_SOCIAL_ATTENDANCE_SET).toBe('event_social.attendance_set');
  });

  it('should expose EVENT_ATTENDANCE_UPDATED in EventWebsocketMessagingType and WebsocketMessagingType', () => {
    expect(EventWebsocketMessagingType.EVENT_ATTENDANCE_UPDATED).toBe('event.attendance_updated');
    expect(WebsocketMessagingType.EVENT_ATTENDANCE_UPDATED).toBe('event.attendance_updated');
  });

  it('should type EventRegistry[EVENT_SOCIAL_ATTENDANCE_SET]', () => {
    const payload: EventRegistry[SocialEventMessagingType.EVENT_SOCIAL_ATTENDANCE_SET] =
      buildAttendanceSetPayload();

    expect(payload.eventId).toBe('event-123');
    expect(payload.checkedUserIds).toHaveLength(2);
    expect(payload.uncheckedUserIds).toEqual(['user-3']);
  });

  it('should type WebsocketEventRegistry[EVENT_ATTENDANCE_UPDATED]', () => {
    const wsPayload: WebsocketEventRegistry[EventWebsocketMessagingType.EVENT_ATTENDANCE_UPDATED] =
      { eventId: 'event-123', checked: true };

    expect(wsPayload.checked).toBe(true);
  });
});
