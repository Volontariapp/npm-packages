import { describe, expect, it, beforeAll, afterAll, beforeEach } from '@jest/globals';
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

describe('EventQueueConsumer (Integration)', () => {
  let consumer: EventQueueConsumer;
  let repository: Repository<EventQueueModel>;
  const logger = makeLoggerMock();

  beforeAll(async () => {
    await initializeTestDb();
    databaseMapper.registerBidirectional(EventQueueModel, EventQueueEntity);
    repository = testDataSource.getRepository(EventQueueModel);
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await repository.createQueryBuilder().delete().execute();
  });

  it('fetchPendingItems() should fetch pending items and mark them as processing', async () => {
    const testRepository = new TestEventQueueRepository(repository);
    consumer = new EventQueueConsumer(logger, testRepository, 10);

    // 1. Seed the database with a pending item
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

    // 2. Fetch pending items
    const fetchedItems = await consumer.fetchPendingItems();

    // 3. Assertions
    expect(fetchedItems).toHaveLength(1);
    expect(fetchedItems[0]).toBeInstanceOf(EventQueueEntity);
    expect(fetchedItems[0].id).toBe(eventId);
    expect(fetchedItems[0].status).toBe(OutboxStatus.PROCESSING);

    // 4. Verify in database
    const dbItem = await repository.findOneByOrFail({ id: eventId });
    expect(dbItem.status).toBe(OutboxStatus.PROCESSING);
    expect(dbItem.updatedAt).toBeDefined();
  });

  it('fetchPendingItems() should return empty array when no pending items', async () => {
    const testRepository = new TestEventQueueRepository(repository);
    consumer = new EventQueueConsumer(logger, testRepository, 10);

    const fetchedItems = await consumer.fetchPendingItems();
    expect(fetchedItems).toHaveLength(0);
  });

  it('fetchPendingItems() should respect the size limit', async () => {
    const testRepository = new TestEventQueueRepository(repository);
    consumer = new EventQueueConsumer(logger, testRepository, 2);

    // Seed 3 items
    const items = [1, 2, 3].map((i) =>
      repository.create({
        id: `00000000-0000-0000-0000-00000000000${i.toString()}`,
        type: 'test.event',
        emitter: 'test.service',
        status: OutboxStatus.PENDING,
        payload: { after: { i } },
        createdAt: new Date(Date.now() + i), // ensuring deterministic order if needed
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
    const consumer1 = new EventQueueConsumer(logger, testRepository, 2);
    const consumer2 = new EventQueueConsumer(logger, testRepository, 2);
    const consumer3 = new EventQueueConsumer(logger, testRepository, 2);

    // Seed 4 items
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

    // Run in parallel
    const [res1, res2, res3] = await Promise.all([
      consumer1.fetchPendingItems(),
      consumer2.fetchPendingItems(),
      consumer3.fetchPendingItems(),
    ]);

    // Total should be 4 across all consumers
    const allFetched = [...res1, ...res2, ...res3];
    expect(allFetched).toHaveLength(4);

    // Specifically:
    // Two consumers should get 2 items each
    // One consumer should get 0 items
    const lengths = [res1.length, res2.length, res3.length].sort();
    expect(lengths).toEqual([0, 2, 2]);
  });
});
