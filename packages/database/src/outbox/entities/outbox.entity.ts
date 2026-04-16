import type { OutboxStatus } from '../types/outbox.status.js';

export class OutboxEntity {
  id!: string;

  // Tracking and attempts
  status!: OutboxStatus;
  attempts!: number;
  lastError?: string;

  type!: string;
  emitter!: string;

  createdAt!: Date;
}
