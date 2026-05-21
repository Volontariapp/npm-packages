import type { EventType as ContractEventType, EventState } from '@volontariapp/contracts';

export enum EventMessagingType {
  EVENT_CHANGED = 'event.changed',
  REQUIREMENT_CHANGED = 'requirement.changed',
  TAG_CHANGED = 'tag.changed',
  EVENT_TAG_LINKED = 'event.tag_linked',
  JOB_OUTBOX_SUCCESS = 'job.outbox.success',
  JOB_OUTBOX_FAILED = 'job.outbox.failed',
}

export interface IEventPayload {
  id: string;
  name: string;
  description: string;
  startAt: Date;
  endAt: Date;
  type: ContractEventType;
  state: EventState;
  awardedImpactScore: number;
  maxParticipants: number;
  organizerId?: string;
  localisationName: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IRequirementPayload {
  id: string;
  name: string;
  description?: string;
  quantity: number;
  currentQuantity: number;
  isSystem: boolean;
  createdBy?: string;
}

export interface ITagPayload {
  id: string;
  name: string;
  slug: string;
  balise: string;
}

export interface IEventTagLinkedPayload {
  eventsId: string;
  tagsId: string;
}

export interface EventChangedPayload<T> {
  before: T | null;
  after: T | null;
}

export interface IJobAuditPayload {
  id: string;
  job_id: string;
  job_type: string;
  status: string;
  worker_id: string;
  current_attempt: number;
  started_at: string | null;
  finished_at: string | null;
  result_payload: Record<string, unknown> | null;
  error_message: string | null;
  error_stack: string | null;
  created_at: string;
  updated_at: string | null;
}
