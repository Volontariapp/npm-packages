import type { IEventSocialAttendanceSetPayload } from '../index.js';

export function buildAttendanceSetPayload(
  overrides: Partial<IEventSocialAttendanceSetPayload> = {},
): IEventSocialAttendanceSetPayload {
  return {
    eventId: 'event-123',
    checkedUserIds: ['user-1', 'user-2'],
    uncheckedUserIds: ['user-3'],
    ...overrides,
  };
}
