import { describe, expect, it, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';
import {
  databaseMapper,
  JobsOutboxModel,
  JobsOutboxEntity,
  OutboxStatus,
} from '@volontariapp/database';
import type { Repository } from 'typeorm';
import type { Redis } from 'ioredis';
import { testDataSource, initializeTestDb, closeTestDb } from '../../data-source.js';
import { JobsOutboxConsumer } from '../../../consumers/jobs-outbox.consumer.js';
import { TestJobsOutboxRepository } from '../../utils/repositories/jobs-outbox-test.repository.js';
import { makeLoggerMock } from '../../utils/helpers/shared/logger-mock.helper.js';
import { JobsOutboxPusher } from '../../../pushers/jobs-outbox.pusher.js';
import { createTestRedisConnection } from '../../redis-config.js';

describe('JobsOutboxConsumer (Integration)', () => {
  let consumer: JobsOutboxConsumer;
  let repository: Repository<JobsOutboxModel>;
  let pusher: JobsOutboxPusher;
  let redis: Redis;
  const logger = makeLoggerMock();

  beforeAll(async () => {
    await initializeTestDb();
    databaseMapper.registerBidirectional(JobsOutboxModel, JobsOutboxEntity);
    repository = testDataSource.getRepository(JobsOutboxModel);
    redis = createTestRedisConnection();
    pusher = new JobsOutboxPusher(logger, redis);
  });

  afterAll(async () => {
    await pusher.close();
    await redis.quit();
    await closeTestDb();
  });

  beforeEach(async () => {
    await repository.createQueryBuilder().delete().execute();
    jest.clearAllMocks();
  });

  it('fetchPendingItems() should fetch pending items and mark them as processing', async () => {
    const testRepository = new TestJobsOutboxRepository(repository);
    consumer = new JobsOutboxConsumer(logger, testRepository, 10, pusher);

    const jobId = '00000000-0000-0000-0000-000000000001';
    const pendingItem = repository.create({
      id: jobId,
      type: 'test.job',
      emitter: 'test.service',
      emitterId: '00000000-0000-0000-0000-000000000000',
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

  it('should handle parallel consumption correctly', async () => {
    const testRepository = new TestJobsOutboxRepository(repository);
    const consumer1 = new JobsOutboxConsumer(logger, testRepository, 2, pusher);
    const consumer2 = new JobsOutboxConsumer(logger, testRepository, 2, pusher);
    const consumer3 = new JobsOutboxConsumer(logger, testRepository, 2, pusher);

    // Seed 4 items
    const items = [1, 2, 3, 4].map((i) =>
      repository.create({
        id: `00000000-0000-0000-0000-00000000000${i.toString()}`,
        type: 'test.job',
        emitter: 'test.service',
        emitterId: '00000000-0000-0000-0000-000000000000',
        status: OutboxStatus.PENDING,
        payload: { data: `test-${i.toString()}` },
        createdAt: new Date(Date.now() + i),
        updatedAt: new Date(),
        scheduledAt: new Date(),
        version: 1,
        attempts: 0,
        target: 'test.target',
      } as Partial<JobsOutboxModel>),
    );
    await repository.save(items);

    // Run in parallel
    const [res1, res2, res3] = await Promise.all([
      consumer1.fetchPendingItems(),
      consumer2.fetchPendingItems(),
      consumer3.fetchPendingItems(),
    ]);

    // Total should be 4 across all consumers
    const allFetched = [...res1, ...res2, ...res3];
    expect(allFetched).toHaveLength(4);

    const lengths = [res1.length, res2.length, res3.length];
    const total = lengths.reduce((acc, curr) => acc + curr, 0);
    expect(total).toBe(4);
    expect(Math.max(...lengths)).toBeLessThanOrEqual(2);
  });

  it('processItems() should push items and mark them as COMPLETED', async () => {
    const testRepository = new TestJobsOutboxRepository(repository);
    consumer = new JobsOutboxConsumer(logger, testRepository, 10, pusher);

    const jobId = '00000000-0000-0000-0000-000000000010';
    const item = repository.create({
      id: jobId,
      type: 'test.job',
      emitter: 'test.service',
      emitterId: '00000000-0000-0000-0000-000000000000',
      status: OutboxStatus.PROCESSING,
      payload: { data: 'test' },
      createdAt: new Date(),
      updatedAt: new Date(),
      scheduledAt: new Date(),
      version: 1,
      attempts: 0,
      target: 'test.target',
    } as Partial<JobsOutboxModel>);
    await repository.save(item);

    const entity = await testRepository.findOneOrFail({ id: jobId });
    const pushSpy = jest.spyOn(pusher, 'pushElement');

    await consumer.processItems([entity]);

    expect(pushSpy).toHaveBeenCalledWith(expect.objectContaining({ id: jobId }));

    const dbItem = await repository.findOneByOrFail({ id: jobId });
    expect(dbItem.status).toBe(OutboxStatus.COMPLETED);
  });
});
