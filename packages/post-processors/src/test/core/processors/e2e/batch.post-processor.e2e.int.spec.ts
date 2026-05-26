import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  beforeAll,
  afterAll,
  jest,
} from '@jest/globals';
import type { Repository } from 'typeorm';
import { Redis } from 'ioredis';
import {
  databaseMapper,
  EventQueueModel,
  EventQueueEntity,
  OutboxStatus,
} from '@volontariapp/database';
import { Logger } from '@volontariapp/logger';
import type { Streams } from '@volontariapp/shared';
import { testDataSource, initializeTestDb, closeTestDb } from '../../../data-source.js';
import { testRedisOptions } from '../../../redis-config.js';
import { E2EBatchPostProcessor, pushDbEvents, waitFor } from '../../../utils/index.js';
import { CircuitBreakerState } from '../../../../enums/circuit-breaker-state.enum.js';

describe('BatchPostProcessor E2E Integration Flow', () => {
  let redis: Redis;
  let repository: Repository<EventQueueModel>;
  let processor: E2EBatchPostProcessor;
  const testLogger = new Logger({ context: 'E2E-Batch' });

  beforeAll(async () => {
    await initializeTestDb();
    databaseMapper.registerBidirectional(EventQueueModel, EventQueueEntity);
    repository = testDataSource.getRepository(EventQueueModel);
    redis = new Redis(testRedisOptions);
  });

  afterAll(async () => {
    await redis.quit().catch(() => undefined);
    await closeTestDb().catch(() => undefined);
  });

  beforeEach(async () => {
    await repository.createQueryBuilder().delete().execute();
    await redis.flushdb();
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await processor.stop();
  });

  it('should process a batch of events end-to-end from Postgres outbox table', async () => {
    processor = new E2EBatchPostProcessor(redis, {
      streamName: 'stream:batch-service',
      groupName: 'group:batch-e2e',
      consumerName: 'consumer:batch-e2e-1',
      claimIntervalMs: 100,
      claimMinIdleTimeMs: 100,
      blockMs: 50,
      batchSize: 5,
    });

    const eventIds = [
      '00000000-0000-0000-0000-000000000101',
      '00000000-0000-0000-0000-000000000102',
      '00000000-0000-0000-0000-000000000103',
    ];

    const events = eventIds.map((id) => ({ id, type: 'event.changed' }));
    await pushDbEvents(repository, redis, testLogger, events, ['batch-service' as Streams]);

    await processor.start();

    await waitFor(() => processor.processedBatches.length === 1, 3000);

    const batch = processor.processedBatches[0];
    expect(batch.length).toBe(3);
    expect(batch.map((item) => item.event.id).sort()).toEqual(eventIds.sort());

    // Verify all were marked as COMPLETED in the outbox database
    for (const eventId of eventIds) {
      const dbItem = await repository.findOneByOrFail({ id: eventId });
      expect(dbItem.status).toBe(OutboxStatus.COMPLETED);
    }
  });

  it('should retry a failed batch with exponential backoff and then succeed', async () => {
    processor = new E2EBatchPostProcessor(redis, {
      streamName: 'stream:batch-service',
      groupName: 'group:batch-e2e',
      consumerName: 'consumer:batch-e2e-1',
      claimIntervalMs: 100,
      claimMinIdleTimeMs: 50,
      blockMs: 50,
      batchSize: 5,
      retry: {
        maxRetries: 3,
        initialDelayMs: 100,
        maxDelayMs: 1000,
        backoffMultiplier: 2,
        enableDlq: true,
      },
    });

    const eventId = '00000000-0000-0000-0000-000000000104';
    await pushDbEvents(
      repository,
      redis,
      testLogger,
      [{ id: eventId, type: 'event.changed' }],
      ['batch-service' as Streams],
    );

    processor.processError = new Error('Transient database batch error');
    processor.failEventIds.add(eventId);
    await processor.start();

    // Verify batch fails and is registered in the ZSET retry queue
    const retryQueueKey = 'retry-queue:post-processor:group:batch-e2e';
    await waitFor(async () => {
      const zcard = await redis.zcard(retryQueueKey);
      return zcard === 1;
    }, 3000);

    expect(processor.processedBatches.length).toBe(0);

    // Clear the error
    processor.processError = null;
    processor.failEventIds.clear();

    await waitFor(() => processor.processedBatches.length === 1, 3000);
    expect(processor.processedBatches[0][0].event.id).toBe(eventId);

    // Verify retry queue is cleared
    const zcardFinal = await redis.zcard(retryQueueKey);
    expect(zcardFinal).toBe(0);
  });

  it('should adjust batch size dynamically based on processing latency', async () => {
    processor = new E2EBatchPostProcessor(redis, {
      streamName: 'stream:batch-service',
      groupName: 'group:batch-e2e-dynamic',
      consumerName: 'consumer:batch-e2e-1',
      claimIntervalMs: 100,
      claimMinIdleTimeMs: 100,
      blockMs: 50,
      batchSize: 5,
      dynamicBatching: {
        enabled: true,
        minBatchSize: 2,
        maxBatchSize: 10,
        targetLatencyMs: 10,
      },
    });

    const initialBatchSize = processor.getCurrentBatchSize();
    expect(initialBatchSize).toBe(5);

    // Setup events
    const eventIds = [
      '00000000-0000-0000-0000-000000000105',
      '00000000-0000-0000-0000-000000000106',
    ];
    await pushDbEvents(
      repository,
      redis,
      testLogger,
      eventIds.map((id) => ({ id, type: 'event.changed' })),
      ['batch-service' as Streams],
    );

    // Make processing take longer than targetLatencyMs (e.g., 30ms) to trigger size reduction
    processor.processDelayMs = 30;

    await processor.start();

    await waitFor(
      () =>
        processor.processedBatches.length === 1 &&
        processor.getCurrentBatchSize() < initialBatchSize,
      5000,
    );

    // Verify batch size was adjusted down
    const finalBatchSize = processor.getCurrentBatchSize();
    expect(finalBatchSize).toBeLessThan(initialBatchSize);
  });

  it('should skip processing and acknowledge when idempotency lock is already acquired', async () => {
    processor = new E2EBatchPostProcessor(redis, {
      streamName: 'stream:batch-service',
      groupName: 'group:batch-e2e',
      consumerName: 'consumer:batch-e2e-1',
      claimIntervalMs: 100,
      claimMinIdleTimeMs: 100,
      blockMs: 50,
      batchSize: 5,
      idempotencyTtlSeconds: 10,
    });

    const eventId = '00000000-0000-0000-0000-000000000107';
    await pushDbEvents(
      repository,
      redis,
      testLogger,
      [{ id: eventId, type: 'event.changed' }],
      ['batch-service' as Streams],
    );

    // Get the stream message id
    const streamName = 'stream:batch-service';
    const entries = await redis.xrange(streamName, '-', '+');
    expect(entries.length).toBe(1);
    const messageId = entries[0][0];

    // Pre-acquire idempotency lock
    const lockKey = `idempotency:post-processor:group:batch-e2e:${messageId}`;
    await redis.set(lockKey, 'processed', 'EX', 10);

    await processor.start();

    await new Promise((resolve) => setTimeout(resolve, 300));

    // Verify processEvents was never called
    expect(processor.processedBatches.length).toBe(0);

    // Verify message was acknowledged
    const pending = await redis.xpending(streamName, 'group:batch-e2e', '-', '+', 10);
    expect(pending.length).toBe(0);
  });

  it('should transition circuit breaker to OPEN on consecutive failures and HALF_OPEN after reset timeout', async () => {
    processor = new E2EBatchPostProcessor(redis, {
      streamName: 'stream:batch-service',
      groupName: 'group:batch-e2e-cb',
      consumerName: 'consumer:batch-e2e-1',
      claimIntervalMs: 100,
      claimMinIdleTimeMs: 100,
      blockMs: 50,
      batchSize: 5,
      circuitBreaker: {
        failureThreshold: 1,
        resetTimeoutMs: 1000,
        successThreshold: 1,
      },
      retry: {
        maxRetries: 0,
        initialDelayMs: 50,
        maxDelayMs: 100,
        backoffMultiplier: 1.5,
        enableDlq: true,
      },
    });

    const eventIds = ['00000000-0000-0000-0000-000000000108'];

    await pushDbEvents(
      repository,
      redis,
      testLogger,
      [{ id: eventIds[0], type: 'event.changed' }],
      ['batch-service' as Streams],
    );

    processor.processError = new Error('Batch CB trigger failure');
    processor.failEventIds.add(eventIds[0]);
    await processor.start();

    const cb = processor.getCircuitBreaker();

    // Wait for circuit breaker to transition to OPEN
    await waitFor(() => cb.getState() === CircuitBreakerState.OPEN, 3000);

    const eventId3 = '00000000-0000-0000-0000-000000000110';
    await pushDbEvents(
      repository,
      redis,
      testLogger,
      [{ id: eventId3, type: 'event.changed' }],
      ['batch-service' as Streams],
    );

    // Verify it is not processed while CB is OPEN
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(cb.getState()).toBe(CircuitBreakerState.OPEN);
    expect(processor.processedBatches.length).toBe(0);

    // Clear failures
    processor.processError = null;
    processor.failEventIds.clear();

    // Wait for CB to transition to HALF_OPEN/CLOSED and process the 3rd event
    await waitFor(() => processor.processedBatches.length === 1, 4000);
    expect(processor.processedBatches[0][0].event.id).toBe(eventId3);
    expect(cb.getState()).toBe(CircuitBreakerState.CLOSED);
  });
});
