import type { OutboxModelStatus } from '../types/outbox-model.status.js';

export abstract class OutboxModel {
  id!: string;

  // Tracking and attempts
  status!: OutboxModelStatus;
  attemps!: number;
  lastError?: string;

  type!: string;
  emitter!: string;

  createdAt!: Date;
}
