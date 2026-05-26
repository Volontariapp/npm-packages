import type { Streams } from '@volontariapp/shared';

/**
 * Interface representing the structure of an event pushed to Redis Streams.
 */
export interface RedisEventMessage<T = unknown> {
  id: string;
  type: string;
  emitter: string;
  emitterId: string;
  traceId?: string;
  version: number;
  payload: {
    before?: T;
    after: T;
  };
  createdAt: string; // ISO string for serialization
}

/**
 * Interface representing the raw data fields as they are stored in Redis Streams.
 * All values are strings for Redis compatibility.
 */
export interface RedisEventStreamFields {
  id: string;
  type: string;
  emitter: string;
  emitterId: string;
  traceId: string;
  version: string;
  createdAt: string;
  payload: string; // JSON string of { before?: P, after: P }
  event: string; // JSON string of RedisEventMessage<P>
}

/**
 * Interface representing a deserialized event for post-processors.
 * Reuses RedisEventMessage structure to avoid duplication.
 */
export type StreamEvent<P = unknown> = RedisEventMessage<P>;

/**
 * Returns the Redis Stream name for a given service domain.
 * @param service The service domain (e.g., 'social', 'user')
 */
export function getEventStreamName(service: Streams | string): string {
  return `stream:${service}`;
}
