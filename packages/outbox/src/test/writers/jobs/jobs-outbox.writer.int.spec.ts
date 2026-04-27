import { describe, expect, it, beforeAll, afterAll, beforeEach } from '@jest/globals';
import {
  databaseMapper,
  JobsOutboxModel,
  JobsOutboxEntity,
  OutboxStatus,
} from '@volontariapp/database';
import { testDataSource, initializeTestDb, closeTestDb } from '../../data-source.js';
import { JobsOutboxWriter } from '../../../writers/jobs-outbox.writer.js';
import { makeJobsOutboxEvent } from '../../utils/helpers/jobs-outbox-event.helper.js';
import { TestJobsOutboxRepository } from '../../utils/repositories/jobs-outbox-test.repository.js';
import type { Logger } from '@volontariapp/logger';
import { makeLoggerMock } from '../../utils/helpers/logger-mock.helper.js';

describe('JobsOutboxWriter (Full Integration)', () => {
  let writer: JobsOutboxWriter;
  const logger: Logger = makeLoggerMock();

  beforeAll(async () => {
    await initializeTestDb();
    databaseMapper.registerBidirectional(JobsOutboxModel, JobsOutboxEntity);
    writer = new JobsOutboxWriter(
      logger,
      new TestJobsOutboxRepository(testDataSource.getRepository(JobsOutboxModel)),
    );
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await testDataSource.getRepository(JobsOutboxModel).createQueryBuilder().delete().execute();
  });

  it('create() should persist default values when not overridden', async () => {
    const event = makeJobsOutboxEvent();

    await writer.create(event);

    const row = await testDataSource
      .getRepository(JobsOutboxModel)
      .findOneByOrFail({ type: 'jobs.process' });

    expect(row.status).toBe(OutboxStatus.PENDING);
    expect(row.attempts).toBe(0);
    expect(row.target).toBe('queue:default');
    expect(row.payload).toEqual({ action: 'process-user', data: { userId: 'u-1' } });
    expect(row.scheduledAt).toEqual(event.scheduledAt);
  });

  it('create() should persist overridden values', async () => {
    const event = makeJobsOutboxEvent({
      type: 'jobs.retry',
      status: OutboxStatus.PROCESSING,
      attempts: 4,
      target: 'queue:critical',
      payload: { action: 'retry-job', data: { userId: 'u-99' } },
      scheduledAt: new Date('2030-01-02T00:00:00.000Z'),
    });

    await writer.create(event);

    const row = await testDataSource
      .getRepository(JobsOutboxModel)
      .findOneByOrFail({ type: 'jobs.retry' });

    expect(row.status).toBe(OutboxStatus.PROCESSING);
    expect(row.attempts).toBe(4);
    expect(row.target).toBe('queue:critical');
    expect(row.payload).toEqual({ action: 'retry-job', data: { userId: 'u-99' } });
    expect(row.scheduledAt).toEqual(event.scheduledAt);
  });
});
