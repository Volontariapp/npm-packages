import { Column, Entity } from 'typeorm';
import { OutboxModel } from '../../../outbox/models/outbox.model.js';
import type { OutboxType } from '../../../outbox/types/outbox.type.js';

@Entity('outbox_extended')
export class ExtendedOutboxModel<T extends OutboxType = OutboxType> extends OutboxModel<T> {
  @Column({ type: 'varchar', length: 50, default: 'default' })
  channel: T = 'default' as T;
}
