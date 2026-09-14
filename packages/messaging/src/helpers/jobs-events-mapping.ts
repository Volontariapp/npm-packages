import {
  EVENT_EVENT_TO_WS_EVENT_MAPPING,
  POST_EVENT_TO_WS_EVENT_MAPPING,
  USER_EVENT_TO_WS_EVENT_MAPPING,
  JOB_TO_EVENT_MAPPING,
  getEventForJob,
} from '../events/index.js';
import type { WebsocketMessagingType } from '../websockets/index.js';

export { JOB_TO_EVENT_MAPPING, getEventForJob };

export const EVENT_TO_WS_EVENT_MAPPING = {
  ...EVENT_EVENT_TO_WS_EVENT_MAPPING,
  ...POST_EVENT_TO_WS_EVENT_MAPPING,
  ...USER_EVENT_TO_WS_EVENT_MAPPING,
} as const;

export type EventToWsEventMapping = typeof EVENT_TO_WS_EVENT_MAPPING;

export function getWsEventForEvent(
  eventType: string,
): WebsocketMessagingType {
  const wsEvent = EVENT_TO_WS_EVENT_MAPPING[eventType as keyof EventToWsEventMapping];
  if (!wsEvent) {
    throw new Error(`No ws event mapping found for event type: ${eventType}`);
  }
  return wsEvent as WebsocketMessagingType;
}
