import { describe, expect, it, beforeAll, afterAll, beforeEach } from '@jest/globals';
import {
  databaseMapper,
  EventQueueModel,
  EventQueueEntity,
  OutboxStatus,
  type Repository,
} from '@volontariapp/database';
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
    const pendingItem = repository.create({
      id: 'event-1',
      type: 'test.event',
      emitter: 'test.service',
      status: OutboxStatus.PENDING,
      payload: { data: 'test' },
      createdAt: new Date(),
      version: 1,
      attempts: 0,
    } as Partial<EventQueueModel>);
    await repository.save(pendingItem);

    // 2. Fetch pending items
    const fetchedItems = await consumer.fetchPendingItems();

    // 3. Assertions
    expect(fetchedItems).toHaveLength(1);
    expect(fetchedItems[0]).toBeInstanceOf(EventQueueEntity);
    expect(fetchedItems[0].id).toBe('event-1');
    expect(fetchedItems[0].status).toBe(OutboxStatus.PROCESSING);

    // 4. Verify in database
    const dbItem = await repository.findOneByOrFail({ id: 'event-1' });
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
        id: `event-${i.toString()}`,
        type: 'test.event',
        emitter: 'test.service',
        status: OutboxStatus.PENDING,
        payload: { i },
        createdAt: new Date(Date.now() + i), // ensuring deterministic order if needed
        version: 1,
        attempts: 0,
      } as Partial<EventQueueModel>),
    );
    await repository.save(items);

    const fetchedItems = await consumer.fetchPendingItems();
    expect(fetchedItems).toHaveLength(2);
  });
});
