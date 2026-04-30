import type { JobPayload } from '../types/payload.registry.js';
import { OutboxModel } from './outbox.model.js';
import { Column, Entity } from 'typeorm';
import type { JobType } from '../types/job.type.js';

@Entity('jobs_outbox')
export class JobsOutboxModel<K extends JobType = JobType> extends OutboxModel<K> {
  @Column({ type: 'varchar', length: 100 })
  target!: string;

  @Column({ type: 'jsonb' })
  payload!: JobPayload<K>;

  @Column({ name: 'scheduled_at', type: 'timestamp' })
  scheduledAt?: Date;
}
