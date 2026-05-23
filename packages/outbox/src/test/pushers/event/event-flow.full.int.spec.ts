import { describe, expect, it, beforeAll, afterAll, beforeEach } from '@jest/globals';
import {
  databaseMapper,
  EventQueueModel,
  EventQueueEntity,
  OutboxStatus,
} from '@volontariapp/database';
import type { Repository } from 'typeorm';
import { Redis } from 'ioredis';
import { testDataSource, initializeTestDb, closeTestDb } from '../../data-source.js';
import { EventQueueConsumer } from '../../../consumers/event-queue.consumer.js';
import { EventQueuePusher } from '../../../pushers/event-queue.pusher.js';
import { TestEventQueueRepository } from '../../utils/repositories/event-queue-test.repository.js';
import { makeLoggerMock } from '../../utils/helpers/shared/logger-mock.helper.js';
import { clearTestRedis, testRedisOptions } from '../../redis-config.js';
import { ServiceType } from '@volontariapp/shared';

describe('Event Full Flow (Integration)', () => {
  let modelRepository: Repository<EventQueueModel>;
  let testRepository: TestEventQueueRepository;
  let pusher: EventQueuePusher;
  let consumer: EventQueueConsumer;
  let redis: Redis;
  const logger = makeLoggerMock();

  beforeAll(async () => {
    await initializeTestDb();
    databaseMapper.registerBidirectional(EventQueueModel, EventQueueEntity);
    modelRepository = testDataSource.getRepository(EventQueueModel);
    redis = new Redis({ ...testRedisOptions, lazyConnect: true });
    await redis.connect();
    testRepository = new TestEventQueueRepository(modelRepository);
    pusher = new EventQueuePusher(logger, redis);
    consumer = new EventQueueConsumer(logger, testRepository, 200, pusher);
  });

  afterAll(async () => {
    await redis.quit();
    await closeTestDb();
  });

  beforeEach(async () => {
    await modelRepository.createQueryBuilder().delete().execute();
    await clearTestRedis();
  });

  it('should insert an event, fetch via consumer, push to Redis, and mark as COMPLETED', async () => {
    // Arrange
    const eventId = '00000000-0000-0000-0000-aabbccddeef0';
    await modelRepository.save(
      modelRepository.create({
        id: eventId,
        type: 'user.created',
        emitter: 'ms-user',
        emitterId: '00000000-0000-0000-0000-000000000000',
        status: OutboxStatus.PENDING,
        payload: { after: { userId: 'u-42' } },
        version: 1,
        attempts: 0,
        targetServices: [ServiceType.POST, ServiceType.SOCIAL],
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Partial<EventQueueModel>),
    );

    // Act — step 1: consumer fetches pending and marks them PROCESSING
    const pendingItems = await consumer.fetchPendingItems();

    // Assert — DB transition
    expect(pendingItems).toHaveLength(1);
    expect(pendingItems[0].id).toBe(eventId);
    const dbAfterFetch = await modelRepository.findOneByOrFail({ id: eventId });
    expect(dbAfterFetch.status).toBe(OutboxStatus.PROCESSING);

    // Act — step 2: consumer processes items (push + mark COMPLETED)
    await consumer.processItems(pendingItems);

    // Assert — DB final state
    const dbAfterProcess = await modelRepository.findOneByOrFail({ id: eventId });
    expect(dbAfterProcess.status).toBe(OutboxStatus.COMPLETED);

    // Assert — Redis stream integrity
    const postStream = await redis.xrange('stream:post', '-', '+');
    const socialStream = await redis.xrange('stream:social', '-', '+');

    expect(postStream).toHaveLength(1);
    expect(socialStream).toHaveLength(1);

    const [, postFields] = postStream[0];
    const eventIndex = postFields.indexOf('event');
    const rawMessage = postFields[eventIndex + 1];
    const message = JSON.parse(rawMessage) as Record<string, unknown>;

    expect(message.id).toBe(eventId);
    expect(message.type).toBe('user.created');
    expect(message.emitter).toBe('ms-user');
    expect(message.version).toBe(1);
    expect(message.payload).toEqual({ after: { userId: 'u-42' } });
    expect(typeof message.createdAt).toBe('string');
  });

  it('should push 100 events in bulk and verify total stream entries across services', async () => {
    // Arrange
    const count = 100;
    const services = [ServiceType.POST, ServiceType.USER, ServiceType.SOCIAL];
    const models = Array.from({ length: count }).map((_, i) =>
      modelRepository.create({
        id: `00000000-0000-0000-0000-${String(i).padStart(12, '0')}`,
        type: 'stress.event',
        emitter: 'ms-stress',
        emitterId: '00000000-0000-0000-0000-000000000000',
        status: OutboxStatus.PENDING,
        payload: { after: { index: i } },
        version: 1,
        attempts: 0,
        targetServices: [services[i % services.length]],
        createdAt: new Date(Date.now() + i),
        updatedAt: new Date(),
      } as Partial<EventQueueModel>),
    );
    await modelRepository.save(models);

    // Act
    const pending = await consumer.fetchPendingItems();
    await consumer.processItems(pending);

    // Assert — all entries landed in Redis
    const lengths = await Promise.all(services.map((s) => redis.xlen(`stream:${s}`)));
    const totalInStreams = lengths.reduce((sum, l) => sum + l, 0);

    expect(totalInStreams).toBe(count);

    // Assert — all DB rows completed
    const processingCount = await modelRepository.count({
      where: { status: OutboxStatus.PROCESSING },
    });
    expect(processingCount).toBe(0);
  });

  it('should mark event as FAILED when pusher throws, preserving stream integrity', async () => {
    // Arrange
    const goodId = '00000000-0000-0000-0000-000000000001';
    const badId = '00000000-0000-0000-0000-000000000002';

    await modelRepository.save([
      modelRepository.create({
        id: goodId,
        type: 'user.created',
        emitter: 'ms-user',
        emitterId: '00000000-0000-0000-0000-000000000000',
        status: OutboxStatus.PROCESSING,
        payload: { after: { userId: 'u-1' } },
        version: 1,
        attempts: 0,
        targetServices: [ServiceType.POST],
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Partial<EventQueueModel>),
      modelRepository.create({
        id: badId,
        type: 'user.created',
        emitter: 'ms-user',
        emitterId: '00000000-0000-0000-0000-000000000000',
        status: OutboxStatus.PROCESSING,
        payload: { after: { userId: 'u-2' } },
        version: 1,
        attempts: 0,
        targetServices: [ServiceType.POST],
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Partial<EventQueueModel>),
    ]);

    const goodEntity = await testRepository.findOneOrFail({ id: goodId });
    const badEntity = await testRepository.findOneOrFail({ id: badId });

    // Fail only the bad entity by using a dedicated pusher with broken connection
    const brokenRedis = new Redis({ ...testRedisOptions, lazyConnect: true });
    await brokenRedis.connect();
    brokenRedis.disconnect();

    const failingPusher = new EventQueuePusher(logger, brokenRedis);
    const failingConsumer = new EventQueueConsumer(logger, testRepository, 10, failingPusher);

    // Act — process good entity with working pusher
    await consumer.processItems([goodEntity]);

    // Act — process bad entity with failing pusher (should handle error internally)
    await failingConsumer.processItems([badEntity]);

    // Assert — good entity completed, bad entity failed
    const goodDb = await modelRepository.findOneByOrFail({ id: goodId });
    const badDb = await modelRepository.findOneByOrFail({ id: badId });

    expect(goodDb.status).toBe(OutboxStatus.COMPLETED);
    expect(badDb.status).toBe(OutboxStatus.FAILED);

    // Assert — only the good entity's event landed in Redis
    const postStream = await redis.xrange('stream:post', '-', '+');
    expect(postStream).toHaveLength(1);

    const [, fields] = postStream[0];
    const raw = fields[fields.indexOf('event') + 1];
    const msg = JSON.parse(raw) as Record<string, unknown>;
    expect(msg.id).toBe(goodId);
  });
});
