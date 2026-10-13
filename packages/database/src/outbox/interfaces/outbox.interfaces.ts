import type { OutboxStatus } from '../types/outbox.status.js';
import type { OutboxType } from '../types/outbox.type.js';

/**
 * Trace context carried from a consumed event to the events it triggers.
 * `traceparent` is required so that a caller building it from a stream message
 * (`RedisEventMessage`) cannot forget it; `''` means no trace context.
 */
export interface EventTraceContext {
  correlationId: string;
  traceId?: string;
  traceparent: string;
}

export interface IOutboxEntity<T extends OutboxType> {
  id: string;
  status: OutboxStatus;
  attempts: number;
  lastError?: string;
  type: T;
  emitter: string;
  emitterId: string;
  updatedAt?: Date;
  createdAt: Date;
  traceId?: string;
  traceparent?: string;
}
export interface IOutboxModel<T extends OutboxType> {
  id: string;
  status: OutboxStatus;
  attempts: number;
  lastError?: string;
  type: T;
  emitter: string;
  emitterId: string;
  updatedAt?: Date;
  createdAt: Date;
  traceId?: string;
  traceparent?: string;
}
