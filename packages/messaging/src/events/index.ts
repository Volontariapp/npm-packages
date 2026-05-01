import { EventMessagingType as EventEventMessagingType } from './event/payloads.js';
import type {
  IEventPayload,
  IRequirementPayload,
  ITagPayload,
  IEventTagLinkedPayload,
  EventChangedPayload,
} from './event/payloads.js';

export const EventMessagingType = {
  ...EventEventMessagingType,
} as const;

export type EventMessagingType = (typeof EventMessagingType)[keyof typeof EventMessagingType];

export interface EventRegistry {
  [EventMessagingType.EVENT_CHANGED]: EventChangedPayload<IEventPayload>;
  [EventMessagingType.REQUIREMENT_CHANGED]: EventChangedPayload<IRequirementPayload>;
  [EventMessagingType.TAG_CHANGED]: EventChangedPayload<ITagPayload>;
  [EventMessagingType.EVENT_TAG_LINKED]: EventChangedPayload<IEventTagLinkedPayload>;
}

export * from './event/payloads.js';
