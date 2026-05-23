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
import { E2ESinglePostProcessor, pushDbEvent, waitFor } from '../../../utils/index.js';
import { CircuitBreakerState } from '../../../../enums/circuit-breaker-state.enum.js';

describe('SinglePostProcessor E2E Integration Flow', () => {
  let redis: Redis;
  let repository: Repository<EventQueueModel>;
  let processor: E2ESinglePostProcessor;
  const testLogger = new Logger({ context: 'E2E-Single' });

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

  it('should process a pending event end-to-end from Postgres outbox table', async () => {
    processor = new E2ESinglePostProcessor(redis, {
      streamName: 'stream:single-service',
      groupName: 'group:single-e2e',
      consumerName: 'consumer:single-e2e-1',
      claimIntervalMs: 100,
      claimMinIdleTimeMs: 100,
      blockMs: 50,
    });

    const eventId = '00000000-0000-0000-0000-000000000001';
    await pushDbEvent(repository, redis, testLogger, eventId, 'event.changed', [
      'single-service' as Streams,
    ]);

    await processor.start();

    await waitFor(() => processor.processedEvents.length === 1, 3000);

    expect(processor.processedEvents[0].event.id).toBe(eventId);
    expect(processor.processedEvents[0].event.type).toBe('event.changed');

    // Verify it was marked as COMPLETED in the outbox database
    const dbItem = await repository.findOneByOrFail({ id: eventId });
    expect(dbItem.status).toBe(OutboxStatus.COMPLETED);
  });

  it('should retry a failed message with exponential backoff and then succeed', async () => {
    processor = new E2ESinglePostProcessor(redis, {
      streamName: 'stream:single-service',
      groupName: 'group:single-e2e',
      consumerName: 'consumer:single-e2e-1',
      claimIntervalMs: 100,
      claimMinIdleTimeMs: 50,
      blockMs: 50,
      retry: {
        maxRetries: 3,
        initialDelayMs: 100,
        maxDelayMs: 1000,
        backoffMultiplier: 2,
        enableDlq: true,
      },
    });

    const eventId = '00000000-0000-0000-0000-000000000002';
    await pushDbEvent(repository, redis, testLogger, eventId, 'event.changed', [
      'single-service' as Streams,
    ]);

    processor.processError = new Error('Transient database error');
    await processor.start();

    // Verify it fails and gets registered in the ZSET retry queue
    const retryQueueKey = 'retry-queue:post-processor:group:single-e2e';
    await waitFor(async () => {
      const zcard = await redis.zcard(retryQueueKey);
      return zcard === 1;
    }, 3000);

    expect(processor.processedEvents.length).toBe(0);

    // Clear the process error and let it succeed
    processor.processError = null;

    await waitFor(() => processor.processedEvents.length === 1, 3000);
    expect(processor.processedEvents[0].event.id).toBe(eventId);

    // Verify retry queue is cleared
    const zcardFinal = await redis.zcard(retryQueueKey);
    expect(zcardFinal).toBe(0);
  });

  it('should send the message to DLQ stream after max retries are exceeded', async () => {
    processor = new E2ESinglePostProcessor(redis, {
      streamName: 'stream:single-service',
      groupName: 'group:single-e2e',
      consumerName: 'consumer:single-e2e-1',
      claimIntervalMs: 100,
      claimMinIdleTimeMs: 50,
      blockMs: 50,
      retry: {
        maxRetries: 1,
        initialDelayMs: 50,
        maxDelayMs: 100,
        backoffMultiplier: 2,
        enableDlq: true,
      },
    });

    const eventId = '00000000-0000-0000-0000-000000000003';
    await pushDbEvent(repository, redis, testLogger, eventId, 'event.changed', [
      'single-service' as Streams,
    ]);

    processor.processError = new Error('Persistent failure');
    await processor.start();

    // Wait for the message to be moved to the DLQ stream
    const dlqStreamName = 'stream:single-service-dlq';
    await waitFor(async () => {
      const xrange = await redis.xrange(dlqStreamName, '-', '+');
      return xrange.length === 1;
    }, 3000);

    expect(processor.processedEvents.length).toBe(0);

    // Verify the DLQ contents
    const xrange = await redis.xrange(dlqStreamName, '-', '+');
    const dlqFields = xrange[0][1];
    const dlqObj: Record<string, string> = {};
    for (let i = 0; i < dlqFields.length; i += 2) {
      dlqObj[dlqFields[i]] = dlqFields[i + 1];
    }

    expect(dlqObj.error).toContain('Persistent failure');
    expect(dlqObj.messageId).toBeDefined();
  });

  it('should skip processing and acknowledge when idempotency lock is already acquired', async () => {
    processor = new E2ESinglePostProcessor(redis, {
      streamName: 'stream:single-service',
      groupName: 'group:single-e2e',
      consumerName: 'consumer:single-e2e-1',
      claimIntervalMs: 100,
      claimMinIdleTimeMs: 100,
      blockMs: 50,
      idempotencyTtlSeconds: 10,
    });

    const eventId = '00000000-0000-0000-0000-000000000004';
    await pushDbEvent(repository, redis, testLogger, eventId, 'event.changed', [
      'single-service' as Streams,
    ]);

    // Get the pushed stream message id
    const streamName = 'stream:single-service';
    const entries = await redis.xrange(streamName, '-', '+');
    expect(entries.length).toBe(1);
    const messageId = entries[0][0];

    // Pre-acquire the idempotency lock in Redis so it blocks processing
    const lockKey = `idempotency:post-processor:group:single-e2e:${messageId}`;
    await redis.set(lockKey, 'processed', 'EX', 10);

    await processor.start();

    // Give it some time to run and check that it was processed/acknowledged
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Verify processEvent was never called
    expect(processor.processedEvents.length).toBe(0);

    // Verify the message was acknowledged (xpending returns empty for group)
    const pending = await redis.xpending(streamName, 'group:single-e2e', '-', '+', 10);
    expect(pending.length).toBe(0);
  });

  it('should recover and process subsequent messages when processEvent throws an error', async () => {
    processor = new E2ESinglePostProcessor(redis, {
      streamName: 'stream:single-service',
      groupName: 'group:single-e2e',
      consumerName: 'consumer:single-e2e-1',
      claimIntervalMs: 100,
      claimMinIdleTimeMs: 100,
      blockMs: 50,
      retry: {
        maxRetries: 0, // No retries, goes straight to DLQ or fails
        initialDelayMs: 50,
        maxDelayMs: 100,
        backoffMultiplier: 1.5,
        enableDlq: true,
      },
    });

    const eventIdFail = '00000000-0000-0000-0000-000000000005';
    const eventIdOk = '00000000-0000-0000-0000-000000000006';

    // Push two events
    await pushDbEvent(repository, redis, testLogger, eventIdFail, 'event.changed', [
      'single-service' as Streams,
    ]);
    await pushDbEvent(repository, redis, testLogger, eventIdOk, 'event.changed', [
      'single-service' as Streams,
    ]);

    // First event will fail
    processor.processError = new Error('Failure on first message');
    processor.failEventIds.add(eventIdFail);
    await processor.start();

    // Wait until the DLQ has 1 message (the failed one)
    const dlqStreamName = 'stream:single-service-dlq';
    await waitFor(async () => {
      const xrange = await redis.xrange(dlqStreamName, '-', '+');
      return xrange.length === 1;
    }, 3000);

    // Verify second message was processed successfully
    await waitFor(() => processor.processedEvents.length === 1, 3000);
    expect(processor.processedEvents[0].event.id).toBe(eventIdOk);
  });

  it('should transition circuit breaker to OPEN on consecutive failures and HALF_OPEN after reset timeout', async () => {
    processor = new E2ESinglePostProcessor(redis, {
      streamName: 'stream:single-service',
      groupName: 'group:single-e2e',
      consumerName: 'consumer:single-e2e-1',
      claimIntervalMs: 100,
      claimMinIdleTimeMs: 100,
      blockMs: 50,
      circuitBreaker: {
        failureThreshold: 2,
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

    const eventId1 = '00000000-0000-0000-0000-000000000007';
    const eventId2 = '00000000-0000-0000-0000-000000000008';

    // Push two failed events, and then one more event
    await pushDbEvent(repository, redis, testLogger, eventId1, 'event.changed', [
      'single-service' as Streams,
    ]);
    await pushDbEvent(repository, redis, testLogger, eventId2, 'event.changed', [
      'single-service' as Streams,
    ]);

    processor.processError = new Error('CB failure trigger');
    processor.failEventIds.add(eventId1);
    processor.failEventIds.add(eventId2);
    await processor.start();

    const cb = processor.getCircuitBreaker();

    // Wait for circuit breaker to transition to OPEN
    await waitFor(() => cb.getState() === CircuitBreakerState.OPEN, 3000);

    const eventId3 = '00000000-0000-0000-0000-000000000009';
    // Push another event while CB is open
    await pushDbEvent(repository, redis, testLogger, eventId3, 'event.changed', [
      'single-service' as Streams,
    ]);

    // Give it a brief moment and verify it's still OPEN and hasn't processed the 3rd event
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(cb.getState()).toBe(CircuitBreakerState.OPEN);
    expect(processor.processedEvents.length).toBe(0);

    // Wait for the CB to enter HALF_OPEN/CLOSED and process the 3rd event (need to wait at least resetTimeoutMs of 1000ms)
    await waitFor(() => processor.processedEvents.length === 1, 4000);
    expect(processor.processedEvents[0].event.id).toBe(eventId3);
    expect(cb.getState()).toBe(CircuitBreakerState.CLOSED);
  });

  it('should leave messages untouched in a stream that nobody processes', async () => {
    processor = new E2ESinglePostProcessor(redis, {
      streamName: 'stream:single-service',
      groupName: 'group:single-e2e',
      consumerName: 'consumer:single-e2e-1',
      claimIntervalMs: 100,
      claimMinIdleTimeMs: 100,
      blockMs: 50,
    });

    const eventId = '00000000-0000-0000-0000-000000000010';
    // Push an event targeting "other-service"
    await pushDbEvent(repository, redis, testLogger, eventId, 'event.changed', [
      'other-service' as Streams,
    ]);

    await processor.start();

    // Give it some time to run
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Processor should have processed 0 messages
    expect(processor.processedEvents.length).toBe(0);

    // Stream "stream:other-service" should still contain the message
    const len = await redis.xlen('stream:other-service');
    expect(len).toBe(1);
  });

  it('should load balance and distribute messages across multiple concurrent processors in the same group', async () => {
    const processor2 = new E2ESinglePostProcessor(redis, {
      streamName: 'stream:single-service',
      groupName: 'group:single-e2e-concurrent',
      consumerName: 'consumer:single-e2e-2',
      claimIntervalMs: 100,
      claimMinIdleTimeMs: 100,
      blockMs: 50,
    });

    processor = new E2ESinglePostProcessor(redis, {
      streamName: 'stream:single-service',
      groupName: 'group:single-e2e-concurrent',
      consumerName: 'consumer:single-e2e-1',
      claimIntervalMs: 100,
      claimMinIdleTimeMs: 100,
      blockMs: 50,
    });

    // Push 10 events
    for (let i = 1; i <= 10; i++) {
      const eventId = `00000000-0000-0000-0000-0000000000${(10 + i).toString()}`;
      await pushDbEvent(repository, redis, testLogger, eventId, 'event.changed', [
        'single-service' as Streams,
      ]);
    }

    await processor.start();
    await processor2.start();

    // Wait until all 10 messages have been processed between the two processors
    await waitFor(() => {
      const totalProcessed = processor.processedEvents.length + processor2.processedEvents.length;
      return totalProcessed === 10;
    }, 5000);

    // Verify each processed some and there were no duplicates
    expect(processor.processedEvents.length).toBeGreaterThan(0);
    expect(processor2.processedEvents.length).toBeGreaterThan(0);

    const ids = [
      ...processor.processedEvents.map((e) => e.event.id),
      ...processor2.processedEvents.map((e) => e.event.id),
    ];
    expect(new Set(ids).size).toBe(10);

    await processor2.stop();
  });
});
