import { Column, Entity } from 'typeorm';
import { OutboxModel } from '../../../outbox/models/outbox.model.js';

@Entity('outbox_extended')
export class ExtendedOutboxModel extends OutboxModel {
  @Column({ type: 'varchar', length: 50, default: 'default' })
  channel: string = 'default';
}
