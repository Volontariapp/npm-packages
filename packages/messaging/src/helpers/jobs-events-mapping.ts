import { JobMessagingType } from '../jobs/index.js';
import { EventEventMessagingType } from '../events/event/payloads.js';

export const JOB_TO_EVENT_MAPPING: Partial<Record<JobMessagingType, string>> = {
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

export function getEventForJob(jobType: JobMessagingType | string): string {
  const event = JOB_TO_EVENT_MAPPING[jobType as JobMessagingType];
  if (!event) {
    throw new Error(`No event mapping found for job type: ${jobType}`);
  }
  return event;
}
