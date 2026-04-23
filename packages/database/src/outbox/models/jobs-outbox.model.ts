import { OutboxModel } from './outbox.model.js';
import { Column, Entity } from 'typeorm';

@Entity('jobs_outbox')
export class JobsOutboxModel extends OutboxModel {
  // destination
  @Column({ type: 'varchar', length: 100 })
  target!: string;

  @Column({ type: 'jsonb' })
  payload: any;

  @Column({ name: 'scheduled_at', type: 'timestamp' })
  scheduledAt?: Date;
}
