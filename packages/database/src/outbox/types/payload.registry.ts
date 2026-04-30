import type { JsonObject } from './json.type.js';

export interface EventPayloadRegistry {
  [key: string]: JsonObject;
}

export interface JobPayloadRegistry {
  [key: string]: JsonObject;
}

export type EventPayload<K extends string> = EventPayloadRegistry[K];
export type JobPayload<K extends string> = JobPayloadRegistry[K];
