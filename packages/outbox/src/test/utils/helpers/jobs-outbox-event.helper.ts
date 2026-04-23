import { OutboxStatus, JobsOutboxEntity } from '@volontariapp/database';

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
    scheduledAt: new Date('2030-01-01T00:00:00.000Z'),
    createdAt: new Date(Date.now() - 60_000),
    updatedAt: new Date(),
    ...overrides,
  });
};
