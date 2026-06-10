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
import { TestEventQueueRepository } from '../../utils/repositories/event-queue-test.repository.js';
import { makeLoggerMock } from '../../utils/helpers/shared/logger-mock.helper.js';
import {
  EventOutboxRunnerHarness,
  waitForStatus,
} from '../../utils/helpers/shared/outbox-runner.helper.js';
import { clearTestRedis, testRedisOptions } from '../../redis-config.js';
import { Streams } from '@volontariapp/shared';
import { getEventStreamName } from '@volontariapp/messaging';

describe('OutboxRunner — Events (Integration)', () => {
  let modelRepo: Repository<EventQueueModel>;
  let testRepo: TestEventQueueRepository;
  let redis: Redis;
  const logger = makeLoggerMock();

  beforeAll(async () => {
    await initializeTestDb();
    databaseMapper.registerBidirectional(EventQueueModel, EventQueueEntity);
    redis = new Redis({ ...testRedisOptions, lazyConnect: true });
    await redis.connect();
    modelRepo = testDataSource.getRepository(EventQueueModel);
    testRepo = new TestEventQueueRepository(modelRepo);
  });

  afterAll(async () => {
    await redis.quit();
    await closeTestDb();
  });

  beforeEach(async () => {
    await modelRepo.createQueryBuilder().delete().execute();
    await clearTestRedis();
  });

  it('should pick up a PENDING event, push it to Redis stream, and mark it COMPLETED', async () => {
    // Arrange
    const eventId = '00000000-0000-0000-0000-000000000101';
    await modelRepo.save(
      modelRepo.create({
        id: eventId,
        type: 'user.created',
        emitter: 'ms-user',
        emitterId: '00000000-0000-0000-0000-000000000000',
        status: OutboxStatus.PENDING,
        payload: { after: { userId: 'u-1' } },
        version: 1,
        attempts: 0,
        targetServices: [Streams.SOCIAL_POSTS],
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Partial<EventQueueModel>),
    );

    const harness = new EventOutboxRunnerHarness(testRepo, redis, logger);

    // Act
    harness.start();
    await waitForStatus(modelRepo, [eventId], OutboxStatus.COMPLETED);
    await harness.stop();

    // Assert — DB
    const dbRow = await modelRepo.findOneByOrFail({ id: eventId });
    expect(dbRow.status).toBe(OutboxStatus.COMPLETED);

    // Assert — Redis stream
    const stream = await redis.xrange('stream:social:posts', '-', '+');
    expect(stream).toHaveLength(1);

    const [, fields] = stream[0];
    const raw = fields[fields.indexOf('event') + 1];
    const message = JSON.parse(raw) as Record<string, unknown>;
    expect(message.id).toBe(eventId);
    expect(message.type).toBe('user.created');
    expect(message.emitter).toBe('ms-user');
    expect(message.version).toBe(1);
    expect(message.payload).toEqual({ after: { userId: 'u-1' } });
    expect(typeof message.createdAt).toBe('string');
  });

  it('should process multiple events targeting different Redis streams', async () => {
    // Arrange
    const services = [Streams.SOCIAL_POSTS, Streams.SOCIAL_INTERACTIONS, Streams.USER_CREATED];
    const ids = services.map(
      (_, i) => `00000000-0000-0000-0000-0000000002${i.toString().padStart(2, '0')}`,
    );

    await modelRepo.save(
      ids.map((id, i) =>
        modelRepo.create({
          id,
          type: 'user.updated',
          emitter: 'ms-user',
          emitterId: '00000000-0000-0000-0000-000000000000',
          status: OutboxStatus.PENDING,
          payload: { after: { index: i } },
          version: 1,
          attempts: 0,
          targetServices: [services[i]],
          createdAt: new Date(Date.now() + i),
          updatedAt: new Date(),
        } as Partial<EventQueueModel>),
      ),
    );

    const harness = new EventOutboxRunnerHarness(testRepo, redis, logger);

    // Act
    harness.start();
    await waitForStatus(modelRepo, ids, OutboxStatus.COMPLETED);
    await harness.stop();

    // Assert — one entry per stream
    expect(await redis.xlen(getEventStreamName(Streams.SOCIAL_POSTS))).toBe(1);
    expect(await redis.xlen(getEventStreamName(Streams.SOCIAL_INTERACTIONS))).toBe(1);
    expect(await redis.xlen(getEventStreamName(Streams.USER_CREATED))).toBe(1);
  });

  it('should process events inserted mid-run (continuous polling)', async () => {
    // Arrange — seed first event
    const firstId = '00000000-0000-0000-0000-000000000301';
    await modelRepo.save(
      modelRepo.create({
        id: firstId,
        type: 'user.created',
        emitter: 'ms-user',
        emitterId: '00000000-0000-0000-0000-000000000000',
        status: OutboxStatus.PENDING,
        payload: { after: { userId: 'u-batch1' } },
        version: 1,
        attempts: 0,
        targetServices: [Streams.SOCIAL_POSTS],
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Partial<EventQueueModel>),
    );

    const harness = new EventOutboxRunnerHarness(testRepo, redis, logger);

    harness.start();
    await waitForStatus(modelRepo, [firstId], OutboxStatus.COMPLETED);

    // Insert second event mid-run
    const secondId = '00000000-0000-0000-0000-000000000302';
    await modelRepo.save(
      modelRepo.create({
        id: secondId,
        type: 'user.updated',
        emitter: 'ms-user',
        emitterId: '00000000-0000-0000-0000-000000000000',
        status: OutboxStatus.PENDING,
        payload: { after: { userId: 'u-batch2' } },
        version: 1,
        attempts: 0,
        targetServices: [Streams.SOCIAL_POSTS],
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Partial<EventQueueModel>),
    );

    await waitForStatus(modelRepo, [secondId], OutboxStatus.COMPLETED);
    await harness.stop();

    // Assert — both in stream
    const stream = await redis.xrange('stream:social:posts', '-', '+');
    expect(stream).toHaveLength(2);
  });

  it('should mark event as FAILED when Redis is disconnected', async () => {
    // Arrange
    const eventId = '00000000-0000-0000-0000-000000000401';
    await modelRepo.save(
      modelRepo.create({
        id: eventId,
        type: 'user.created',
        emitter: 'ms-user',
        emitterId: '00000000-0000-0000-0000-000000000000',
        status: OutboxStatus.PENDING,
        payload: { after: { userId: 'u-fail' } },
        version: 1,
        attempts: 0,
        targetServices: [Streams.SOCIAL_POSTS],
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Partial<EventQueueModel>),
    );

    const harness = await EventOutboxRunnerHarness.createWithBrokenRedis(testRepo, logger);

    // Act
    harness.start();
    await waitForStatus(modelRepo, [eventId], OutboxStatus.FAILED);
    await harness.stop();

    // Assert
    const dbRow = await modelRepo.findOneByOrFail({ id: eventId });
    expect(dbRow.status).toBe(OutboxStatus.FAILED);
    expect(await redis.xlen('stream:social:posts')).toBe(0);
  });

  it('should process 50 events in bulk and mark all COMPLETED', async () => {
    // Arrange
    const count = 50;
    const allServices = [Streams.SOCIAL_POSTS, Streams.USER_CREATED, Streams.SOCIAL_INTERACTIONS];
    const models = Array.from({ length: count }).map((_, i) =>
      modelRepo.create({
        id: `00000000-0000-0000-0000-${String(i).padStart(12, '0')}`,
        type: 'stress.event',
        emitter: 'ms-stress',
        emitterId: '00000000-0000-0000-0000-000000000000',
        status: OutboxStatus.PENDING,
        payload: { after: { index: i } },
        version: 1,
        attempts: 0,
        targetServices: [allServices[i % allServices.length]],
        createdAt: new Date(Date.now() + i),
        updatedAt: new Date(),
      } as Partial<EventQueueModel>),
    );
    await modelRepo.save(models);

    const harness = new EventOutboxRunnerHarness(testRepo, redis, logger);

    // Act
    harness.start();
    await waitForStatus(
      modelRepo,
      models.map((m) => m.id),
      OutboxStatus.COMPLETED,
      10000,
    );
    await harness.stop();

    // Assert — total Redis entries == count
    const lengths = await Promise.all(allServices.map((s) => redis.xlen(`stream:${s}`)));
    expect(lengths.reduce((acc, l) => acc + l, 0)).toBe(count);
  });
});
