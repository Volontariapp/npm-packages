import { Column, Entity } from 'typeorm';
import { OutboxStatus } from '../types/outbox.status.js';
import type { IOutboxModel } from '../interfaces/outbox.interfaces.js';
import type { OutboxType } from '../types/outbox.type.js';
import { BaseModel } from '../../core/base.model.js';

@Entity('outbox')
export class OutboxModel<T extends OutboxType = OutboxType>
  extends BaseModel
  implements IOutboxModel<T>
{
  @Column({ type: 'varchar', length: 20, default: OutboxStatus.PENDING })
  status: OutboxStatus = OutboxStatus.PENDING;

  @Column({ type: 'int', default: 0 })
  attempts: number = 0;

  @Column({ type: 'text', nullable: true })
  lastError?: string;

  @Column({ type: 'varchar', length: 100 })
  type!: T;

  @Column({ type: 'varchar', length: 100 })
  emitter!: string;

  @Column({ type: 'uuid' })
  emitterId!: string;

  @Column({ type: 'uuid', nullable: true })
  traceId?: string;
}
