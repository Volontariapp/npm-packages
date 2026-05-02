import type { JsonObject } from './json.type.js';

export interface EventPayloadRegistry {}

export interface JobPayloadRegistry {}

export type EventPayload<K extends string> = K extends keyof EventPayloadRegistry
  ? EventPayloadRegistry[K]
  : JsonObject;

export type JobPayload<K extends string> = K extends keyof JobPayloadRegistry
  ? JobPayloadRegistry[K]
  : JsonObject;
