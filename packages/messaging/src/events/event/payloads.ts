import type { EventType as ContractEventType, EventState } from '@volontariapp/contracts';

export enum EventMessagingType {
  EVENT_CHANGED = 'event.changed',
  REQUIREMENT_CHANGED = 'requirement.changed',
  TAG_CHANGED = 'tag.changed',
  EVENT_TAG_LINKED = 'event.tag_linked',
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
