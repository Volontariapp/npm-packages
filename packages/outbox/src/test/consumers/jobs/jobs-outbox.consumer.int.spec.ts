import { describe, expect, it, beforeAll, afterAll, beforeEach } from '@jest/globals';
import {
  databaseMapper,
  JobsOutboxModel,
  JobsOutboxEntity,
  OutboxStatus,
  type Repository,
} from '@volontariapp/database';
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

    const pendingItem = repository.create({
      id: 'job-1',
      type: 'test.job',
      emitter: 'test.service',
      status: OutboxStatus.PENDING,
      payload: { data: 'test' },
      createdAt: new Date(),
      version: 1,
      attempts: 0,
      target: 'test.target',
    } as Partial<JobsOutboxModel>);
    await repository.save(pendingItem);

    const fetchedItems = await consumer.fetchPendingItems();

    expect(fetchedItems).toHaveLength(1);
    expect(fetchedItems[0]).toBeInstanceOf(JobsOutboxEntity);
    expect(fetchedItems[0].id).toBe('job-1');
    expect(fetchedItems[0].status).toBe(OutboxStatus.PROCESSING);

    const dbItem = await repository.findOneByOrFail({ id: 'job-1' });
    expect(dbItem.status).toBe(OutboxStatus.PROCESSING);
  });
});
