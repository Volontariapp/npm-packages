import { EventEventMessagingType } from '../../events/event/payloads.js';
import { EventWebsocketMessagingType } from './types.js';
import { JobMessagingType } from '../../jobs/index.js';
import type { RankingReadyListKind } from '../../jobs/ranking/payloads.js';

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
  // One notification type for both lists: the mapping is per job type, not per reason.
  [JobMessagingType.COMPUTE_USER_RANKING]: EventEventMessagingType.RANKING_READY,
  [JobMessagingType.COMPUTE_USER_FEED]: EventEventMessagingType.RANKING_READY,
};

export function getEventForJob(jobType: JobMessagingType | string): EventEventMessagingType {
  const event = JOB_TO_EVENT_MAPPING[jobType as JobMessagingType];
  if (!event) {
    throw new Error(`No event mapping found for job type: ${jobType}`);
  }
  return event;
}

const RANKING_JOB_TO_LIST_KIND: Partial<Record<string, RankingReadyListKind>> = {
  [JobMessagingType.COMPUTE_USER_RANKING]: 'EVENT',
  [JobMessagingType.COMPUTE_USER_FEED]: 'POST',
};

/**
 * Adds the produced list to the payload of a finished ranking computation. Both computations map
 * to the same ranking.ready notification, so this is the only place where the list is known.
 * Any other job type gets its payload back unchanged.
 */
export function withRankingListKind<T extends object>(
  jobType: JobMessagingType | string,
  payload: T,
): T | (T & { listKind: RankingReadyListKind }) {
  const listKind = RANKING_JOB_TO_LIST_KIND[jobType];
  return listKind === undefined ? payload : { ...payload, listKind };
}

export const EVENT_EVENT_TO_WS_EVENT_MAPPING = {
  [EventEventMessagingType.EVENT_CREATED]: EventWebsocketMessagingType.EVENT_CREATED,
  [EventEventMessagingType.EVENT_DELETED]: EventWebsocketMessagingType.EVENT_DELETED,
  [EventEventMessagingType.EVENT_CREATION_SUCCESSFULL]: EventWebsocketMessagingType.EVENT_CREATED,
  [EventEventMessagingType.EVENT_CREATION_FAILED]: EventWebsocketMessagingType.EVENT_CREATION_FAILED,
  [EventEventMessagingType.EVENT_DELETION_SUCCESSFULL]: EventWebsocketMessagingType.EVENT_DELETED,
  [EventEventMessagingType.EVENT_DELETION_FAILED]: EventWebsocketMessagingType.EVENT_DELETION_FAILED,

  [EventEventMessagingType.RANKING_READY]: EventWebsocketMessagingType.RANKING_READY,

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
