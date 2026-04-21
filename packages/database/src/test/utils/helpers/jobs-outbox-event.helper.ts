import { OutboxStatus } from '../../../outbox/types/outbox.status.js';
import { JobsOutboxEntity } from '../../../outbox/entities/jobs-outbox.entity.js';

export const makeJobsOutboxEvent = (
  overrides: Partial<JobsOutboxEntity> = {},
): JobsOutboxEntity => {
  return Object.assign(new JobsOutboxEntity(), {
    type: 'jobs.process',
    emitter: 'database-tests',
    target: 'queue:default',
    payload: { action: 'process-user', data: { userId: 'u-1' } },
    status: OutboxStatus.PENDING,
    attempts: 0,
    createdAt: new Date(Date.now() - 60_000),
    updatedAt: new Date(),
    ...overrides,
  });
};
