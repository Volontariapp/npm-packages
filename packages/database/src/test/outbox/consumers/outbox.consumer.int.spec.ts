import { describe, it, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';
import type { Redis } from 'ioredis';
import { testDataSource, setupIntegrationTest, RealRedisPusher } from '../../utils/index.js';
import { OutboxModel } from '../../../outbox/models/outbox.model.js';
import { OutboxConsumer } from '../../../outbox/consumers/outbox.consumer.js';
import { OutboxDispatcher } from '../../../outbox/dispatchers/outbox.dispatcher.js';
import { OutboxStatus } from '../../../outbox/types/outbox.status.js';
import { makeOutboxEvent } from '../../utils/helpers/outbox-event.helper.js';
import { TestOutboxRepository } from '../../utils/repositories/outbox-test.repository.js';
import type { LoggerMock } from '../../utils/helpers/logger-mock.helper.js';
import { makeLoggerMock } from '../../utils/helpers/logger-mock.helper.js';
import type { OutboxEntity } from '../../../outbox/entities/outbox.entity.js';
import { clearTestRedis, createTestRedisConnection } from '../../redis-config.js';

describe('OutboxConsumer (Integration)', () => {
  let repository: TestOutboxRepository;
  let loggerMock: LoggerMock;
  let redis: Redis;
  let pusher: RealRedisPusher;

  setupIntegrationTest([OutboxModel]);

  beforeAll(() => {
    loggerMock = makeLoggerMock();
    repository = new TestOutboxRepository(testDataSource.getRepository(OutboxModel));
    redis = createTestRedisConnection();
    pusher = new RealRedisPusher(redis);
  });

  afterAll(async () => {
    if (redis.status !== 'end') {
      await redis.quit();
    }
  });

  beforeEach(async () => {
    await clearTestRedis();
    jest.clearAllMocks();
  });

  it('should fetch waiting items and mark them as processing', async () => {
    const repo = testDataSource.getRepository(OutboxModel);
    const event1 = makeOutboxEvent({
      id: '00000000-0000-0000-0000-000000000001',
      status: OutboxStatus.PENDING,
    });
    const event2 = makeOutboxEvent({
      id: '00000000-0000-0000-0000-000000000002',
      status: OutboxStatus.PENDING,
    });
    await repo.save([event1, event2]);

    const dispatcher = new OutboxDispatcher(loggerMock, repository);
    const singleConsumer = new OutboxConsumer(loggerMock, repository, 1, dispatcher, pusher);
    const items = await singleConsumer.fetchPendingItems();
    expect(items).toHaveLength(1);
    expect(items[0].status).toBe(OutboxStatus.PROCESSING);

    const dbItem = await repo.findOneBy({ id: items[0].id });
    expect(dbItem?.status).toBe(OutboxStatus.PROCESSING);

    const remaining = await repo.countBy({ status: OutboxStatus.PENDING });
    expect(remaining).toBe(1);
  });

  it('should handle parallel consumers correctly using SKIP LOCKED', async () => {
    const repo = testDataSource.getRepository(OutboxModel);
    const events = Array.from({ length: 10 }).map((_, i: number) =>
      makeOutboxEvent({
        id: `00000000-0000-0000-0000-0000000000${(i + 1).toString().padStart(2, '0')}`,
        status: OutboxStatus.PENDING,
      }),
    );
    await repo.save(events);

    const dispatcher = new OutboxDispatcher(loggerMock, repository);
    const consumer1 = new OutboxConsumer(loggerMock, repository, 5, dispatcher, pusher);
    const consumer2 = new OutboxConsumer(loggerMock, repository, 5, dispatcher, pusher);
    const [results1, results2] = await Promise.all([
      consumer1.fetchPendingItems(),
      consumer2.fetchPendingItems(),
    ]);

    expect(results1).toHaveLength(5);
    expect(results2).toHaveLength(5);

    const ids1 = new Set(results1.map((i: OutboxModel) => i.id));
    const ids2 = new Set(results2.map((i: OutboxModel) => i.id));

    const intersection = [...ids1].filter((id: string) => ids2.has(id));
    expect(intersection).toHaveLength(0);

    const totalProcessed = await repo.countBy({ status: OutboxStatus.PROCESSING });
    expect(totalProcessed).toBe(10);
  });

  it('should handle three parallel consumers: two fetching all items, third getting none', async () => {
    const repo = testDataSource.getRepository(OutboxModel);
    const events = Array.from({ length: 10 }).map((_, i: number) =>
      makeOutboxEvent({
        id: `00000000-0000-1111-0000-0000000000${(i + 1).toString().padStart(2, '0')}`,
        status: OutboxStatus.PENDING,
      }),
    );
    await repo.save(events);

    const dispatcher = new OutboxDispatcher(loggerMock, repository);
    const consumer1 = new OutboxConsumer(loggerMock, repository, 5, dispatcher, pusher);
    const consumer2 = new OutboxConsumer(loggerMock, repository, 5, dispatcher, pusher);
    const consumer3 = new OutboxConsumer(loggerMock, repository, 5, dispatcher, pusher);

    const [results1, results2, results3] = await Promise.all([
      consumer1.fetchPendingItems(),
      consumer2.fetchPendingItems(),
      consumer3.fetchPendingItems(),
    ]);

    const allResults = [results1, results2, results3];
    const fiveItemsResults = allResults.filter((r: OutboxEntity[]) => r.length === 5);
    const zeroItemsResults = allResults.filter((r: OutboxEntity[]) => r.length === 0);

    expect(fiveItemsResults).toHaveLength(2);
    expect(zeroItemsResults).toHaveLength(1);

    const totalProcessed = await repo.countBy({ status: OutboxStatus.PROCESSING });
    expect(totalProcessed).toBe(10);
  });

  it('markItemsAsCompleted() should mark items as COMPLETED in database', async () => {
    const repo = testDataSource.getRepository(OutboxModel);
    const event = makeOutboxEvent({
      id: '00000000-0000-0000-0000-000000000100',
      status: OutboxStatus.PROCESSING,
    });
    await repo.save(event);

    const dispatcher = new OutboxDispatcher(loggerMock, repository);
    const consumer = new OutboxConsumer(loggerMock, repository, 10, dispatcher, pusher);

    const entity = await repository.findOneOrFail({ id: event.id });
    await consumer.markItemsAsCompleted([entity]);

    const dbItem = await repo.findOneBy({ id: event.id });
    expect(dbItem?.status).toBe(OutboxStatus.COMPLETED);
  });

  it('processItems() should process items, push them and mark them as COMPLETED in database', async () => {
    const repo = testDataSource.getRepository(OutboxModel);
    const event = makeOutboxEvent({
      id: '00000000-0000-0000-0000-000000000101',
      status: OutboxStatus.PROCESSING,
    });
    await repo.save(event);

    const dispatcher = new OutboxDispatcher(loggerMock, repository);
    const consumer = new OutboxConsumer(loggerMock, repository, 10, dispatcher, pusher);

    const pushSpy = jest.spyOn(pusher, 'pushElement');
    const entity = await repository.findOneOrFail({ id: event.id });
    await consumer.processItems([entity]);

    expect(pushSpy).toHaveBeenCalledWith(entity);

    const dbItem = await repo.findOneBy({ id: event.id });
    expect(dbItem?.status).toBe(OutboxStatus.COMPLETED);

    // Verify it's actually in Redis
    const redisItem = await redis.get(`outbox:${entity.id}`);
    expect(redisItem).not.toBeNull();
    expect(JSON.parse(redisItem as string).id).toBe(entity.id);
  });

  it('processItems() should mark items as FAILED in database if pusher fails', async () => {
    const repo = testDataSource.getRepository(OutboxModel);
    const event = makeOutboxEvent({
      id: '00000000-0000-0000-0000-000000000200',
      status: OutboxStatus.PROCESSING,
    });
    await repo.save(event);

    const dispatcher = new OutboxDispatcher(loggerMock, repository);
    const consumer = new OutboxConsumer(loggerMock, repository, 10, dispatcher, pusher);

    // Disconnect Redis to simulate a connection failure
    redis.disconnect();

    const entity = await repository.findOneOrFail({ id: event.id });
    await consumer.processItems([entity]);

    const dbItem = await repo.findOneBy({ id: event.id });
    expect(dbItem?.status).toBe(OutboxStatus.FAILED);
    expect(dbItem?.lastError).toContain('Connection is closed');
  });
});
