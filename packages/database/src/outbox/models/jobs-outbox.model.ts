import type { JobPayload } from '../types/payload.registry.js';
import { OutboxModel } from './outbox.model.js';
import { Column, Entity, Index } from 'typeorm';
import type { JobType } from '../types/job.type.js';

/**
 * `(status, created_at, id)` serves the outbox polling query (`WHERE status = 'PENDING' ORDER BY
 * created_at, id`) and the purge of the COMPLETED rows without reading the whole table.
 */
@Index('IDX_jobs_outbox_status_created_at', ['status', 'createdAt', 'id'])
@Entity('jobs_outbox')
export class JobsOutboxModel<K extends JobType = JobType> extends OutboxModel<K> {
  @Column({ type: 'varchar', length: 100 })
  target!: string;

  @Column({ type: 'jsonb' })
  payload!: JobPayload<K>;

  @Column({ name: 'scheduled_at', type: 'timestamp' })
  scheduledAt?: Date;
}
