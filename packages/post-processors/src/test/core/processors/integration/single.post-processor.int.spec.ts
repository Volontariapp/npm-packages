import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { Redis } from 'ioredis';
import { testRedisOptions } from '../../../redis-config.js';
import { CircuitBreakerState } from '../../../../enums/circuit-breaker-state.enum.js';
import {
  TestPostProcessor,
  makeTestEvent,
  pushTestEventToStream,
  TestMessagingStream,
  TestMessagingGroup,
  TestMessagingConsumer,
  waitFor,
  type RedisXPendingSummary,
} from '../../../utils/index.js';

describe('SinglePostProcessor — Integration', () => {
  let redis: Redis;
  let processor: TestPostProcessor;

  beforeAll(() => {
    redis = new Redis(testRedisOptions);
  });

  afterAll(async () => {
    await redis.quit();
  });

  beforeEach(async () => {
    await redis.flushdb();

    processor = new TestPostProcessor(redis, {
      streamName: TestMessagingStream.TEST_STREAM,
      groupName: TestMessagingGroup.TEST_GROUP,
      consumerName: TestMessagingConsumer.TEST_CONSUMER,
      claimIntervalMs: 200,
      claimMinIdleTimeMs: 50,
      blockMs: 50,
      circuitBreaker: {
        failureThreshold: 3,
        resetTimeoutMs: 1000,
        successThreshold: 1,
      },
      retry: {
        maxRetries: 2,
        initialDelayMs: 100,
        maxDelayMs: 500,
        backoffMultiplier: 2,
        enableDlq: true,
      },
    });
  });

  afterEach(async () => {
    await processor.stop();
  });

  it('should successfully read, process, and acknowledge events from a real Redis Stream', async () => {
    const eventPayload = makeTestEvent('evt-int-1');

    await pushTestEventToStream(redis, TestMessagingStream.TEST_STREAM, 'evt-int-1', eventPayload);

    await processor.start();

    await new Promise((resolve) => setTimeout(resolve, 300));

    expect(processor.processedEvents).toHaveLength(1);
    expect(processor.processedEvents[0]?.id).toBe('evt-int-1');

    const pendingInfo = (await redis.call(
      'XPENDING',
      TestMessagingStream.TEST_STREAM,
      TestMessagingGroup.TEST_GROUP,
    )) as RedisXPendingSummary;
    const pendingCount = Number(pendingInfo[0]);
    expect(pendingCount).toBe(0);
  });

  it('should not acknowledge message if processing throws an error', async () => {
    const eventPayload = makeTestEvent('evt-int-fail');

    await pushTestEventToStream(
      redis,
      TestMessagingStream.TEST_STREAM,
      'evt-int-fail',
      eventPayload,
    );

    processor.processError = new Error('Integration processing error');

    await processor.start();
    await new Promise((resolve) => setTimeout(resolve, 300));

    expect(processor.processedEvents).toHaveLength(0);

    const pendingInfo = (await redis.call(
      'XPENDING',
      TestMessagingStream.TEST_STREAM,
      TestMessagingGroup.TEST_GROUP,
    )) as RedisXPendingSummary;
    const pendingCount = Number(pendingInfo[0]);
    expect(pendingCount).toBe(1);
  });

  it('should claim and process idle pending messages from other consumers', async () => {
    const eventPayload = makeTestEvent('evt-int-claim');

    await redis.call(
      'XGROUP',
      'CREATE',
      TestMessagingStream.TEST_STREAM,
      TestMessagingGroup.TEST_GROUP,
      '0',
      'MKSTREAM',
    );

    await pushTestEventToStream(
      redis,
      TestMessagingStream.TEST_STREAM,
      'evt-int-claim',
      eventPayload,
    );

    await redis.call(
      'XREADGROUP',
      'GROUP',
      TestMessagingGroup.TEST_GROUP,
      'other-consumer',
      'COUNT',
      1,
      'STREAMS',
      TestMessagingStream.TEST_STREAM,
      '>',
    );

    const initialPending = (await redis.call(
      'XPENDING',
      TestMessagingStream.TEST_STREAM,
      TestMessagingGroup.TEST_GROUP,
    )) as RedisXPendingSummary;
    expect(Number(initialPending[0])).toBe(1);

    await new Promise((resolve) => setTimeout(resolve, 200));
    await processor.start();

    await new Promise((resolve) => setTimeout(resolve, 800));

    expect(processor.processedEvents).toHaveLength(1);
    expect(processor.processedEvents[0]?.id).toBe('evt-int-claim');

    const finalPending = (await redis.call(
      'XPENDING',
      TestMessagingStream.TEST_STREAM,
      TestMessagingGroup.TEST_GROUP,
    )) as RedisXPendingSummary;
    expect(Number(finalPending[0])).toBe(0);
  });

  it('should skip processing and acknowledge if message is already locked (idempotence)', async () => {
    const eventPayload = makeTestEvent('evt-int-idempotence');
    const messageId = await pushTestEventToStream(
      redis,
      TestMessagingStream.TEST_STREAM,
      'evt-int-idempotence',
      eventPayload,
    );

    const idempotencyKey = `idempotency:post-processor:${TestMessagingGroup.TEST_GROUP}:${messageId}`;
    await redis.set(idempotencyKey, 'processing');

    await processor.start();
    await new Promise((resolve) => setTimeout(resolve, 300));

    expect(processor.processedEvents).toHaveLength(0);

    const pendingInfo = (await redis.call(
      'XPENDING',
      TestMessagingStream.TEST_STREAM,
      TestMessagingGroup.TEST_GROUP,
    )) as RedisXPendingSummary;
    const pendingCount = Number(pendingInfo[0]);
    expect(pendingCount).toBe(0);
  });

  it('should release idempotency lock if processing throws an error', async () => {
    const eventPayload = makeTestEvent('evt-int-idempotence-fail');
    const messageId = await pushTestEventToStream(
      redis,
      TestMessagingStream.TEST_STREAM,
      'evt-int-idempotence-fail',
      eventPayload,
    );

    processor.processError = new Error('Integration processing error');

    await processor.start();
    await new Promise((resolve) => setTimeout(resolve, 300));

    expect(processor.processedEvents).toHaveLength(0);

    const idempotencyKey = `idempotency:post-processor:${TestMessagingGroup.TEST_GROUP}:${messageId}`;
    const lockVal = await redis.get(idempotencyKey);
    expect(lockVal).toBeNull();
  });

  it('should transition Circuit Breaker to OPEN on consecutive failures', async () => {
    const eventPayload1 = makeTestEvent('evt-cb-1');
    const eventPayload2 = makeTestEvent('evt-cb-2');
    const eventPayload3 = makeTestEvent('evt-cb-3');

    await pushTestEventToStream(redis, TestMessagingStream.TEST_STREAM, 'evt-cb-1', eventPayload1);
    await pushTestEventToStream(redis, TestMessagingStream.TEST_STREAM, 'evt-cb-2', eventPayload2);
    await pushTestEventToStream(redis, TestMessagingStream.TEST_STREAM, 'evt-cb-3', eventPayload3);

    processor.processError = new Error('Database connection failed');

    await processor.start();
    await new Promise((resolve) => setTimeout(resolve, 400));

    // The circuit breaker should trip to OPEN
    const diag = processor.getCircuitBreaker().getDiagnostics();
    expect(diag.state).toBe(CircuitBreakerState.OPEN);
    expect(diag.failureCount).toBeGreaterThanOrEqual(3);
  });

  it('should successfully retry and recover after a transient error', async () => {
    const eventPayload = makeTestEvent('evt-retry-recover');
    const messageId = await pushTestEventToStream(
      redis,
      TestMessagingStream.TEST_STREAM,
      'evt-retry-recover',
      eventPayload,
    );

    // Fail first attempt
    processor.processError = new Error('Simulated transient error');
    await processor.start();

    const retryKey = `retry:post-processor:${TestMessagingGroup.TEST_GROUP}:${messageId}:attempt`;

    await waitFor(async () => {
      const attempt = await redis.get(retryKey);
      return Number(attempt) === 1;
    });

    expect(processor.processedEvents).toHaveLength(0);

    processor.processError = null;

    await waitFor(() => processor.processedEvents.length === 1, 3000);

    expect(processor.processedEvents[0]?.id).toBe('evt-retry-recover');
  });
});
