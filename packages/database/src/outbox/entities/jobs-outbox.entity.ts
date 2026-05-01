import type { JobPayload } from '../types/payload.registry.js';
import { OutboxEntity } from './outbox.entity.js';
import type { JobType } from '../types/job.type.js';

export class JobsOutboxEntity<
  K extends JobType = JobType,
  P = JobPayload<K>,
> extends OutboxEntity<K> {
  target!: string;

  payload!: P;

  scheduledAt?: Date;
}
