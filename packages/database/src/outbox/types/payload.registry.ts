import type { EventRegistry, JobRegistry } from '@volontariapp/messaging';
import type { JsonObject } from './json.type.js';

export interface EventPayloadRegistry extends EventRegistry {}

export interface JobPayloadRegistry extends JobRegistry {}

export type EventPayload<K extends string> = K extends keyof EventPayloadRegistry
  ? EventPayloadRegistry[K]
  : JsonObject;

export type JobPayload<K extends string> = K extends keyof JobPayloadRegistry
  ? JobPayloadRegistry[K]
  : JsonObject;
