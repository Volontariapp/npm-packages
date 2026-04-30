import { describe, expect, it, beforeAll, afterAll, beforeEach } from '@jest/globals';
import {
  databaseMapper,
  JobsOutboxModel,
  JobsOutboxEntity,
  OutboxStatus,
} from '@volontariapp/database';
import { testDataSource, initializeTestDb, closeTestDb } from '../../data-source.js';
import { JobsOutboxDispatcher } from '../../../dispatchers/jobs-outbox.dispatcher.js';
import { TestJobsOutboxRepository } from '../../utils/repositories/jobs-outbox-test.repository.js';
import { makeLoggerMock } from '../../utils/helpers/logger-mock.helper.js';
import type { FakePayload } from '../../utils/helpers/jobs-outbox-generics.helper.js';
import { JobType } from '../../utils/helpers/jobs-outbox-generics.helper.js';

describe('JobsOutbox Generics (Integration)', () => {
  let dispatcher: JobsOutboxDispatcher<JobType, FakePayload>;
  let repository: TestJobsOutboxRepository<JobType, FakePayload>;
  const logger = makeLoggerMock();

  beforeAll(async () => {
    await initializeTestDb();
    databaseMapper.registerBidirectional(JobsOutboxModel, JobsOutboxEntity);
    repository = new TestJobsOutboxRepository<JobType, FakePayload>(
      testDataSource.getRepository(JobsOutboxModel),
    );
    dispatcher = new JobsOutboxDispatcher<JobType, FakePayload>(logger, repository);
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await testDataSource.getRepository(JobsOutboxModel).createQueryBuilder().delete().execute();
  });

  it('should persist and retrieve a perfectly typed generic job', async () => {
    const job = new JobsOutboxEntity<JobType.FAKE, FakePayload>();
    job.id = '00000000-0000-0000-0000-000000000001';
    job.type = JobType.FAKE;
    job.emitter = 'test';
    job.status = OutboxStatus.PENDING;
    job.payload = { foo: 'bar', count: 42 };
    job.target = 'test';
    job.scheduledAt = new Date();

    await repository.create(job);

    const retrieved = await repository.findOneOrFail({ id: job.id });

    expect(retrieved.type).toBe(JobType.FAKE);
    expect(retrieved.payload.foo).toBe('bar');
    expect(retrieved.payload.count).toBe(42);

    await dispatcher.markAsProcessing(retrieved);

    const updated = await repository.findOneOrFail({ id: job.id });
    expect(updated.status).toBe(OutboxStatus.PROCESSING);
  });
});
