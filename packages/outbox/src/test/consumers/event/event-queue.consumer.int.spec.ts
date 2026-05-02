import { describe, expect, it, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';
import {
  databaseMapper,
  EventQueueModel,
  EventQueueEntity,
  OutboxStatus,
} from '@volontariapp/database';
import type { Repository } from 'typeorm';
import { testDataSource, initializeTestDb, closeTestDb } from '../../data-source.js';
import { EventQueueConsumer } from '../../../consumers/event-queue.consumer.js';
import { TestEventQueueRepository } from '../../utils/repositories/event-queue-test.repository.js';
import { makeLoggerMock } from '../../utils/helpers/logger-mock.helper.js';
import { EventQueuePusher } from '../../../pushers/event-queue.pusher.js';
import type { Logger } from '@volontariapp/logger';

describe('EventQueueConsumer (Integration)', () => {
  let consumer: EventQueueConsumer;
  let repository: Repository<EventQueueModel>;
  let pusher: EventQueuePusher;
  const logger = makeLoggerMock();

  beforeAll(async () => {
    await initializeTestDb();
    databaseMapper.registerBidirectional(EventQueueModel, EventQueueEntity);
    repository = testDataSource.getRepository(EventQueueModel);
    pusher = new EventQueuePusher(logger as unknown as Logger);
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await repository.createQueryBuilder().delete().execute();
    jest.clearAllMocks();
  });

  it('fetchPendingItems() should fetch pending items and mark them as processing', async () => {
    const testRepository = new TestEventQueueRepository(repository);
    consumer = new EventQueueConsumer(logger as unknown as Logger, testRepository, 10, pusher);

    const eventId = '00000000-0000-0000-0000-000000000001';
    const pendingItem = repository.create({
      id: eventId,
      type: 'test.event',
      emitter: 'test.service',
      status: OutboxStatus.PENDING,
      payload: { after: { data: 'test' } },
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1,
      attempts: 0,
    } as Partial<EventQueueModel>);
    await repository.save(pendingItem);

    const fetchedItems = await consumer.fetchPendingItems();

    expect(fetchedItems).toHaveLength(1);
    expect(fetchedItems[0]).toBeInstanceOf(EventQueueEntity);
    expect(fetchedItems[0].id).toBe(eventId);
    expect(fetchedItems[0].status).toBe(OutboxStatus.PROCESSING);

    const dbItem = await repository.findOneByOrFail({ id: eventId });
    expect(dbItem.status).toBe(OutboxStatus.PROCESSING);
    expect(dbItem.updatedAt).toBeDefined();
  });

  it('fetchPendingItems() should return empty array when no pending items', async () => {
    const testRepository = new TestEventQueueRepository(repository);
    consumer = new EventQueueConsumer(logger as unknown as Logger, testRepository, 10, pusher);

    const fetchedItems = await consumer.fetchPendingItems();
    expect(fetchedItems).toHaveLength(0);
  });

  it('fetchPendingItems() should respect the size limit', async () => {
    const testRepository = new TestEventQueueRepository(repository);
    consumer = new EventQueueConsumer(logger as unknown as Logger, testRepository, 2, pusher);

    const items = [1, 2, 3].map((i) =>
      repository.create({
        id: `00000000-0000-0000-0000-00000000000${i.toString()}`,
        type: 'test.event',
        emitter: 'test.service',
        status: OutboxStatus.PENDING,
        payload: { after: { i } },
        createdAt: new Date(Date.now() + i),
        updatedAt: new Date(),
        version: 1,
        attempts: 0,
      } as Partial<EventQueueModel>),
    );
    await repository.save(items);

    const fetchedItems = await consumer.fetchPendingItems();
    expect(fetchedItems).toHaveLength(2);
  });

  it('should handle parallel consumption correctly', async () => {
    const testRepository = new TestEventQueueRepository(repository);
    const consumer1 = new EventQueueConsumer(
      logger as unknown as Logger,
      testRepository,
      2,
      pusher,
    );
    const consumer2 = new EventQueueConsumer(
      logger as unknown as Logger,
      testRepository,
      2,
      pusher,
    );
    const consumer3 = new EventQueueConsumer(
      logger as unknown as Logger,
      testRepository,
      2,
      pusher,
    );

    const items = [1, 2, 3, 4].map((i) =>
      repository.create({
        id: `00000000-0000-0000-0000-00000000000${i.toString()}`,
        type: 'test.event',
        emitter: 'test.service',
        status: OutboxStatus.PENDING,
        payload: { after: { i } },
        createdAt: new Date(Date.now() + i),
        updatedAt: new Date(),
        version: 1,
        attempts: 0,
      } as Partial<EventQueueModel>),
    );
    await repository.save(items);

    const [res1, res2, res3] = await Promise.all([
      consumer1.fetchPendingItems(),
      consumer2.fetchPendingItems(),
      consumer3.fetchPendingItems(),
    ]);

    const allFetched = [...res1, ...res2, ...res3];
    expect(allFetched).toHaveLength(4);

    const lengths = [res1.length, res2.length, res3.length].sort();
    expect(lengths).toEqual([0, 2, 2]);
  });

  it('processItems() should push items and mark them as COMPLETED', async () => {
    const testRepository = new TestEventQueueRepository(repository);
    consumer = new EventQueueConsumer(logger as unknown as Logger, testRepository, 10, pusher);

    const eventId = '00000000-0000-0000-0000-000000000005';
    const item = repository.create({
      id: eventId,
      type: 'test.event',
      emitter: 'test.service',
      status: OutboxStatus.PROCESSING,
      payload: { after: { data: 'test' } },
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1,
      attempts: 0,
    } as Partial<EventQueueModel>);
    await repository.save(item);

    const entity = await testRepository.findOneOrFail({ id: eventId });
    const pushSpy = jest.spyOn(pusher, 'pushElement');

    await consumer.processItems([entity]);

    expect(pushSpy).toHaveBeenCalledWith(expect.objectContaining({ id: eventId }));

    const dbItem = await repository.findOneByOrFail({ id: eventId });
    expect(dbItem.status).toBe(OutboxStatus.COMPLETED);
  });
});
