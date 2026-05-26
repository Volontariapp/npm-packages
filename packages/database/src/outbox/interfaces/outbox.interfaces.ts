import type { OutboxStatus } from '../types/outbox.status.js';
import type { OutboxType } from '../types/outbox.type.js';

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
}
