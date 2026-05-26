import { BaseEntity } from '../../core/base.entity.js';
import type { IOutboxEntity } from '../interfaces/outbox.interfaces.js';
import type { OutboxStatus } from '../types/outbox.status.js';
import type { OutboxType } from '../types/outbox.type.js';

export class OutboxEntity<T extends OutboxType = OutboxType>
  extends BaseEntity
  implements IOutboxEntity<T>
{
  status!: OutboxStatus;

  attempts!: number;

  lastError?: string;

  type!: T;

  emitter!: string;

  traceId?: string;

  emitterId!: string;
}
