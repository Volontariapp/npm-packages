import { JobMessagingType } from '../jobs/index.js';
import { EventEventMessagingType } from '../events/event/payloads.js';
import { EventWebsocketMessagingType } from '../websockets/events/types.js';

export const JOB_TO_EVENT_MAPPING: Partial<Record<JobMessagingType, EventEventMessagingType>> = {
  [JobMessagingType.FALLBACK_CREATE_EVENT]: EventEventMessagingType.FALLBACK_CREATE_EVENT,
  [JobMessagingType.FALLBACK_UPDATE_EVENT]: EventEventMessagingType.FALLBACK_UPDATE_EVENT,
  [JobMessagingType.FALLBACK_DELETE_EVENT]: EventEventMessagingType.FALLBACK_DELETE_EVENT,
  [JobMessagingType.FALLBACK_CHANGE_EVENT_STATE]:
    EventEventMessagingType.FALLBACK_CHANGE_EVENT_STATE,
  [JobMessagingType.FALLBACK_MANAGE_REQUIREMENTS]:
    EventEventMessagingType.FALLBACK_MANAGE_REQUIREMENTS,
  [JobMessagingType.FALLBACK_CREATE_TAG]: EventEventMessagingType.FALLBACK_CREATE_TAG,
  [JobMessagingType.FALLBACK_UPDATE_TAG]: EventEventMessagingType.FALLBACK_UPDATE_TAG,
  [JobMessagingType.FALLBACK_DELETE_TAG]: EventEventMessagingType.FALLBACK_DELETE_TAG,
};

export function getEventForJob(jobType: JobMessagingType | string): EventEventMessagingType {
  const event = JOB_TO_EVENT_MAPPING[jobType as JobMessagingType];
  if (!event) {
    throw new Error(`No event mapping found for job type: ${jobType}`);
  }
  return event;
}

export const EVENT_TO_WS_EVENT_MAPPING = {
  [EventEventMessagingType.EVENT_CREATED]: EventWebsocketMessagingType.EVENT_CREATED,
  [EventEventMessagingType.EVENT_DELETED]: EventWebsocketMessagingType.EVENT_DELETED,
  [EventEventMessagingType.EVENT_CREATION_SUCCESSFULL]: EventWebsocketMessagingType.EVENT_CREATED,
  [EventEventMessagingType.EVENT_CREATION_FAILED]: EventWebsocketMessagingType.EVENT_CREATION_FAILED,
  [EventEventMessagingType.EVENT_DELETION_SUCCESSFULL]: EventWebsocketMessagingType.EVENT_DELETED,
  [EventEventMessagingType.EVENT_DELETION_FAILED]: EventWebsocketMessagingType.EVENT_DELETION_FAILED,

  [EventEventMessagingType.FALLBACK_CREATE_EVENT]:
    EventWebsocketMessagingType.FALLBACK_CREATE_EVENT,
  [EventEventMessagingType.FALLBACK_UPDATE_EVENT]:
    EventWebsocketMessagingType.FALLBACK_UPDATE_EVENT,
  [EventEventMessagingType.FALLBACK_DELETE_EVENT]:
    EventWebsocketMessagingType.FALLBACK_DELETE_EVENT,
  [EventEventMessagingType.FALLBACK_CHANGE_EVENT_STATE]:
    EventWebsocketMessagingType.FALLBACK_CHANGE_EVENT_STATE,
  [EventEventMessagingType.FALLBACK_MANAGE_REQUIREMENTS]:
    EventWebsocketMessagingType.FALLBACK_MANAGE_REQUIREMENTS,
  [EventEventMessagingType.FALLBACK_CREATE_TAG]: EventWebsocketMessagingType.FALLBACK_CREATE_TAG,
  [EventEventMessagingType.FALLBACK_UPDATE_TAG]: EventWebsocketMessagingType.FALLBACK_UPDATE_TAG,
  [EventEventMessagingType.FALLBACK_DELETE_TAG]: EventWebsocketMessagingType.FALLBACK_DELETE_TAG,
} as const;

export type EventToWsEventMapping = typeof EVENT_TO_WS_EVENT_MAPPING;

export function getWsEventForEvent(
  eventType: EventEventMessagingType | string,
): EventWebsocketMessagingType {
  const wsEvent = EVENT_TO_WS_EVENT_MAPPING[eventType as keyof EventToWsEventMapping];
  if (!wsEvent) {
    throw new Error(`No ws event mapping found for event type: ${eventType}`);
  }
  return wsEvent;
}
