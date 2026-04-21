import { describe, expect, it, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { databaseMapper } from '../../../core/mapper.service.js';
import { testDataSource, initializeTestDb, closeTestDb } from '../../data-source.js';
import { JobsOutboxWriter } from '../../../outbox/writer/jobs-outbox.writer.js';
import { JobsOutboxModel } from '../../../outbox/models/jobs-outbox.model.js';
import { JobsOutboxEntity } from '../../../outbox/entities/jobs-outbox.entity.js';
import { OutboxStatus } from '../../../outbox/types/outbox.status.js';
import { makeJobsOutboxEvent } from '../../utils/helpers/jobs-outbox-event.helper.js';
import { TestJobsOutboxWriterRepository } from '../../utils/repositories/jobs-outbox-test.repository.js';

describe('JobsOutboxWriter (Full Integration)', () => {
  let writer: JobsOutboxWriter;

  const logger = {
    info: () => undefined,
    warn: () => undefined,
    error: () => undefined,
  };

  beforeAll(async () => {
    await initializeTestDb();
    databaseMapper.registerBidirectional(JobsOutboxModel, JobsOutboxEntity);
    writer = new JobsOutboxWriter(
      logger as never,
      new TestJobsOutboxWriterRepository(testDataSource.getRepository(JobsOutboxModel)),
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
  });

  it('create() should persist overridden values', async () => {
    const event = makeJobsOutboxEvent({
      type: 'jobs.retry',
      status: OutboxStatus.PROCESSING,
      attempts: 4,
      target: 'queue:critical',
      payload: { action: 'retry-job', data: { userId: 'u-99' } },
    });

    await writer.create(event);

    const row = await testDataSource
      .getRepository(JobsOutboxModel)
      .findOneByOrFail({ type: 'jobs.retry' });

    expect(row.status).toBe(OutboxStatus.PROCESSING);
    expect(row.attempts).toBe(4);
    expect(row.target).toBe('queue:critical');
    expect(row.payload).toEqual({ action: 'retry-job', data: { userId: 'u-99' } });
  });
});
