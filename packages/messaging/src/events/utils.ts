import type { ServiceType } from '@volontariapp/shared';

/**
 * Interface representing the structure of an event pushed to Redis Streams.
 */
export interface RedisEventMessage<T = unknown> {
  id: string;
  type: string;
  emitter: string;
  traceId?: string;
  version: number;
  payload: {
    before?: T;
    after: T;
  };
  createdAt: string; // ISO string for serialization
}

/**
 * Returns the Redis Stream name for a given service domain.
 * @param service The service domain (e.g., 'social', 'user')
 */
export function getEventStreamName(service: ServiceType | string): string {
  return `stream:${service}`;
}
