import { describe, expect, it, beforeAll, afterAll, beforeEach } from '@jest/globals';
import {
  databaseMapper,
  JobsOutboxModel,
  JobsOutboxEntity,
  OutboxStatus,
} from '@volontariapp/database';
import type { Repository } from 'typeorm';
import { testDataSource, initializeTestDb, closeTestDb } from '../../data-source.js';
import { JobsOutboxConsumer } from '../../../consumers/jobs-outbox.consumer.js';
import { TestJobsOutboxRepository } from '../../utils/repositories/jobs-outbox-test.repository.js';
import { makeLoggerMock } from '../../utils/helpers/logger-mock.helper.js';

describe('JobsOutboxConsumer (Integration)', () => {
  let consumer: JobsOutboxConsumer;
  let repository: Repository<JobsOutboxModel>;
  const logger = makeLoggerMock();

  beforeAll(async () => {
    await initializeTestDb();
    databaseMapper.registerBidirectional(JobsOutboxModel, JobsOutboxEntity);
    repository = testDataSource.getRepository(JobsOutboxModel);
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await repository.createQueryBuilder().delete().execute();
  });

  it('fetchPendingItems() should fetch pending items and mark them as processing', async () => {
    const testRepository = new TestJobsOutboxRepository(repository);
    consumer = new JobsOutboxConsumer(logger, testRepository, 10);

    const jobId = '00000000-0000-0000-0000-000000000001';
    const pendingItem = repository.create({
      id: jobId,
      type: 'test.job',
      emitter: 'test.service',
      status: OutboxStatus.PENDING,
      payload: { data: 'test' },
      createdAt: new Date(),
      updatedAt: new Date(),
      scheduledAt: new Date(),
      version: 1,
      attempts: 0,
      target: 'test.target',
    } as Partial<JobsOutboxModel>);
    await repository.save(pendingItem);

    const fetchedItems = await consumer.fetchPendingItems();

    expect(fetchedItems).toHaveLength(1);
    expect(fetchedItems[0]).toBeInstanceOf(JobsOutboxEntity);
    expect(fetchedItems[0].id).toBe(jobId);
    expect(fetchedItems[0].status).toBe(OutboxStatus.PROCESSING);

    const dbItem = await repository.findOneByOrFail({ id: jobId });
    expect(dbItem.status).toBe(OutboxStatus.PROCESSING);
  });
});
