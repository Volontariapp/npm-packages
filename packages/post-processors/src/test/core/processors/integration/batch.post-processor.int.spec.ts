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
import { Redis } from 'ioredis';
import { testRedisOptions } from '../../../redis-config.js';
import { CircuitBreakerState } from '../../../../enums/circuit-breaker-state.enum.js';
import {
  TestBatchPostProcessor,
  makeTestEvent,
  pushTestEventToStream,
  TestMessagingStream,
  TestMessagingGroup,
  TestMessagingConsumer,
  waitFor,
  type RedisXPendingSummary,
} from '../../../utils/index.js';

describe('BatchPostProcessor — Integration', () => {
  let redis: Redis;
  let processor: TestBatchPostProcessor;

  beforeAll(() => {
    redis = new Redis(testRedisOptions);
  });

  afterAll(async () => {
    await redis.quit();
  });

  beforeEach(async () => {
    await redis.flushdb();

    processor = new TestBatchPostProcessor(redis, {
      streamName: TestMessagingStream.TEST_STREAM,
      groupName: TestMessagingGroup.TEST_GROUP,
      consumerName: TestMessagingConsumer.TEST_CONSUMER,
      claimIntervalMs: 200,
      claimMinIdleTimeMs: 50,
      blockMs: 50,
      batchSize: 10,
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

  it('should successfully read and process multiple events as a single batch from a real Redis Stream', async () => {
    const eventPayload1 = makeTestEvent('evt-batch-1');
    const eventPayload2 = makeTestEvent('evt-batch-2');

    await pushTestEventToStream(
      redis,
      TestMessagingStream.TEST_STREAM,
      'evt-batch-1',
      eventPayload1,
    );
    await pushTestEventToStream(
      redis,
      TestMessagingStream.TEST_STREAM,
      'evt-batch-2',
      eventPayload2,
    );

    await processor.start();

    await new Promise((resolve) => setTimeout(resolve, 300));

    expect(processor.processedBatches).toHaveLength(1);
    expect(processor.processedBatches[0]).toHaveLength(2);
    expect(processor.processedBatches[0]?.[0]?.event.id).toBe('evt-batch-1');
    expect(processor.processedBatches[0]?.[1]?.event.id).toBe('evt-batch-2');

    const pendingInfo = (await redis.call(
      'XPENDING',
      TestMessagingStream.TEST_STREAM,
      TestMessagingGroup.TEST_GROUP,
    )) as RedisXPendingSummary;
    const pendingCount = Number(pendingInfo[0]);
    expect(pendingCount).toBe(0);
  });

  it('should not acknowledge batch if processing throws an error', async () => {
    const eventPayload1 = makeTestEvent('evt-batch-fail1');
    const eventPayload2 = makeTestEvent('evt-batch-fail2');

    await pushTestEventToStream(
      redis,
      TestMessagingStream.TEST_STREAM,
      'evt-batch-fail1',
      eventPayload1,
    );
    await pushTestEventToStream(
      redis,
      TestMessagingStream.TEST_STREAM,
      'evt-batch-fail2',
      eventPayload2,
    );

    processor.processError = new Error('Integration batch processing error');

    await processor.start();
    await new Promise((resolve) => setTimeout(resolve, 300));

    expect(processor.processedBatches).toHaveLength(0);

    const pendingInfo = (await redis.call(
      'XPENDING',
      TestMessagingStream.TEST_STREAM,
      TestMessagingGroup.TEST_GROUP,
    )) as RedisXPendingSummary;
    const pendingCount = Number(pendingInfo[0]);
    expect(pendingCount).toBe(2);
  });

  it('should skip already locked events in a batch and process only unlocked ones (idempotence)', async () => {
    const eventPayload1 = makeTestEvent('evt-batch-idemp1');
    const eventPayload2 = makeTestEvent('evt-batch-idemp2');

    const msgId1 = await pushTestEventToStream(
      redis,
      TestMessagingStream.TEST_STREAM,
      'evt-batch-idemp1',
      eventPayload1,
    );
    await pushTestEventToStream(
      redis,
      TestMessagingStream.TEST_STREAM,
      'evt-batch-idemp2',
      eventPayload2,
    );

    const idempotencyKey1 = `idempotency:post-processor:${TestMessagingGroup.TEST_GROUP}:${msgId1}`;
    await redis.set(idempotencyKey1, 'processing');

    await processor.start();
    await new Promise((resolve) => setTimeout(resolve, 300));

    expect(processor.processedBatches).toHaveLength(1);
    expect(processor.processedBatches[0]).toHaveLength(1);
    expect(processor.processedBatches[0]?.[0]?.event.id).toBe('evt-batch-idemp2');

    const pendingInfo = (await redis.call(
      'XPENDING',
      TestMessagingStream.TEST_STREAM,
      TestMessagingGroup.TEST_GROUP,
    )) as RedisXPendingSummary;
    expect(pendingInfo[0]).toBe(0);
  });

  describe('idempotency on the event id', () => {
    const pendingCount = async (): Promise<number> => {
      const pendingInfo = (await redis.call(
        'XPENDING',
        TestMessagingStream.TEST_STREAM,
        TestMessagingGroup.TEST_GROUP,
      )) as RedisXPendingSummary;
      return pendingInfo[0];
    };
    const processedIds = (): string[] =>
      processor.processedBatches.flat().map((item) => item.event.id);

    it('processes an event pushed twice in the same batch only once, and acknowledges both messages', async () => {
      const event = makeTestEvent('evt-dup-same-batch');
      await pushTestEventToStream(redis, TestMessagingStream.TEST_STREAM, event.id, event);
      await pushTestEventToStream(redis, TestMessagingStream.TEST_STREAM, event.id, event);

      await processor.start();
      await waitFor(async () => (await pendingCount()) === 0 && processedIds().length > 0, 3000);

      expect(processedIds()).toEqual(['evt-dup-same-batch']);
    });

    it('acknowledges without processing an event pushed again after it was processed', async () => {
      const event = makeTestEvent('evt-dup-later');
      await pushTestEventToStream(redis, TestMessagingStream.TEST_STREAM, event.id, event);
      await processor.start();
      await waitFor(() => processedIds().length === 1, 3000);

      await pushTestEventToStream(redis, TestMessagingStream.TEST_STREAM, event.id, event);
      await new Promise((resolve) => setTimeout(resolve, 300));

      expect(processedIds()).toEqual(['evt-dup-later']);
      expect(await pendingCount()).toBe(0);
    });

    it('marks a processed event as done on its event id', async () => {
      const event = makeTestEvent('evt-done-key');
      await pushTestEventToStream(redis, TestMessagingStream.TEST_STREAM, event.id, event);

      await processor.start();
      await waitFor(() => processedIds().length === 1, 3000);
      await waitFor(async () => (await pendingCount()) === 0, 3000);

      const key = `idempotency:post-processor:${TestMessagingGroup.TEST_GROUP}:evt-done-key`;
      expect(await redis.get(key)).toBe('done');
    });

    it('processes each event once when 100 duplicated messages are delivered', async () => {
      const events = Array.from({ length: 20 }, (_, index) =>
        makeTestEvent(`evt-dup100-${String(index)}`),
      );
      for (let copy = 0; copy < 5; copy++) {
        for (const event of events) {
          await pushTestEventToStream(redis, TestMessagingStream.TEST_STREAM, event.id, event);
        }
      }

      await processor.start();
      await waitFor(
        async () => (await pendingCount()) === 0 && processedIds().length >= events.length,
        8000,
      );
      await new Promise((resolve) => setTimeout(resolve, 300));

      const processed = processedIds();
      expect(processed).toHaveLength(events.length);
      expect(new Set(processed).size).toBe(events.length);
      expect(await pendingCount()).toBe(0);
    });

    it('leaves a message pending after a consumer died mid-processing, and processes it once the lock expires', async () => {
      const event = makeTestEvent('evt-dead-consumer');
      const key = `idempotency:post-processor:${TestMessagingGroup.TEST_GROUP}:evt-dead-consumer`;
      await redis.xgroup(
        'CREATE',
        TestMessagingStream.TEST_STREAM,
        TestMessagingGroup.TEST_GROUP,
        '$',
        'MKSTREAM',
      );
      await pushTestEventToStream(redis, TestMessagingStream.TEST_STREAM, event.id, event);
      // The dead consumer read the message and took the lock, then never finished.
      await redis.call(
        'XREADGROUP',
        'GROUP',
        TestMessagingGroup.TEST_GROUP,
        'dead-consumer',
        'COUNT',
        '10',
        'STREAMS',
        TestMessagingStream.TEST_STREAM,
        '>',
      );
      await redis.set(key, 'processing', 'PX', 600);

      await processor.start();
      await new Promise((resolve) => setTimeout(resolve, 300));
      expect(processedIds()).toEqual([]);
      expect(await pendingCount()).toBe(1);

      await waitFor(() => processedIds().length === 1, 5000);
      await waitFor(async () => (await pendingCount()) === 0, 3000);
      expect(processedIds()).toEqual(['evt-dead-consumer']);
      expect(await redis.get(key)).toBe('done');
    });

    it('does not acknowledge a message whose event is being processed elsewhere, and processes it once the lock expires', async () => {
      const event = makeTestEvent('evt-held-elsewhere');
      const key = `idempotency:post-processor:${TestMessagingGroup.TEST_GROUP}:evt-held-elsewhere`;
      await redis.set(key, 'processing', 'PX', 400);
      await pushTestEventToStream(redis, TestMessagingStream.TEST_STREAM, event.id, event);

      await processor.start();
      await new Promise((resolve) => setTimeout(resolve, 150));
      expect(processedIds()).toEqual([]);
      expect(await pendingCount()).toBe(1);

      await waitFor(() => processedIds().length === 1, 4000);
      expect(processedIds()).toEqual(['evt-held-elsewhere']);
    });
  });

  it('should release all acquired idempotency locks in a batch if processing fails', async () => {
    const eventPayload1 = makeTestEvent('evt-batch-idemp-fail1');
    const eventPayload2 = makeTestEvent('evt-batch-idemp-fail2');

    const msgId1 = await pushTestEventToStream(
      redis,
      TestMessagingStream.TEST_STREAM,
      'evt-batch-idemp-fail1',
      eventPayload1,
    );
    const msgId2 = await pushTestEventToStream(
      redis,
      TestMessagingStream.TEST_STREAM,
      'evt-batch-idemp-fail2',
      eventPayload2,
    );

    processor.processError = new Error('Integration batch processing error');

    await processor.start();
    await new Promise((resolve) => setTimeout(resolve, 300));

    expect(processor.processedBatches).toHaveLength(0);

    expect(msgId1).not.toBe(msgId2);
    const key1 = `idempotency:post-processor:${TestMessagingGroup.TEST_GROUP}:evt-batch-idemp-fail1`;
    const key2 = `idempotency:post-processor:${TestMessagingGroup.TEST_GROUP}:evt-batch-idemp-fail2`;

    expect(await redis.get(key1)).toBeNull();
    expect(await redis.get(key2)).toBeNull();
  });

  it('should retry batch items individually and recover on subsequent retry loops', async () => {
    const eventPayload1 = makeTestEvent('evt-batch-retry1');
    const eventPayload2 = makeTestEvent('evt-batch-retry2');

    await pushTestEventToStream(
      redis,
      TestMessagingStream.TEST_STREAM,
      'evt-batch-retry1',
      eventPayload1,
    );
    await pushTestEventToStream(
      redis,
      TestMessagingStream.TEST_STREAM,
      'evt-batch-retry2',
      eventPayload2,
    );

    // Fail first run
    processor.processError = new Error('Database locks');

    await processor.start();

    // Wait until both items are enqueued in the retry queue
    const retryQueueKey = `retry-queue:post-processor:${TestMessagingGroup.TEST_GROUP}`;
    await waitFor(async () => {
      const count = await redis.zcard(retryQueueKey);
      return count === 2;
    });

    expect(processor.processedBatches).toHaveLength(0);

    processor.processError = null;

    await waitFor(() => processor.processedBatches.length >= 1, 3000);

    const processedIds = processor.processedBatches.flat().map((item) => item.event.id);
    expect(processedIds).toContain('evt-batch-retry1');
    expect(processedIds).toContain('evt-batch-retry2');
  });

  it('should adjust batch size dynamically based on slow processing latency', async () => {
    await processor.stop(); // Stop default processor

    // Setup processor with dynamic batching enabled
    const dynamicProcessor = new TestBatchPostProcessor(redis, {
      streamName: TestMessagingStream.TEST_STREAM,
      groupName: TestMessagingGroup.TEST_GROUP,
      consumerName: TestMessagingConsumer.TEST_CONSUMER,
      claimIntervalMs: 500,
      blockMs: 50,
      batchSize: 10,
      dynamicBatching: {
        enabled: true,
        minBatchSize: 2,
        maxBatchSize: 10,
        targetLatencyMs: 10, // Very low target to force size reduction
      },
    });

    const eventPayload = makeTestEvent('evt-latency');
    await pushTestEventToStream(
      redis,
      TestMessagingStream.TEST_STREAM,
      'evt-latency',
      eventPayload,
    );

    // Spy on processEvents to inject a slow delay
    const originalProcess = dynamicProcessor.processEvents.bind(dynamicProcessor);
    jest.spyOn(dynamicProcessor, 'processEvents').mockImplementation(async (events) => {
      await new Promise((resolve) => setTimeout(resolve, 30)); // 30ms latency (> 10ms target)
      await originalProcess(events);
    });

    await dynamicProcessor.start();
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Batch size should be dynamically reduced from 10 to 8
    expect(dynamicProcessor.getCurrentBatchSize()).toBe(8);

    await dynamicProcessor.stop();
  });

  it('should trip circuit breaker on consecutive errors and recover after timeout', async () => {
    await processor.stop(); // Stop default

    const cbProcessor = new TestBatchPostProcessor(redis, {
      streamName: TestMessagingStream.TEST_STREAM,
      groupName: TestMessagingGroup.TEST_GROUP,
      consumerName: TestMessagingConsumer.TEST_CONSUMER,
      claimIntervalMs: 100,
      blockMs: 50,
      batchSize: 10,
      circuitBreaker: {
        failureThreshold: 2,
        resetTimeoutMs: 1000, // Minimum valid reset timeout
        successThreshold: 1,
      },
    });

    // Write events to trip breaker
    await pushTestEventToStream(
      redis,
      TestMessagingStream.TEST_STREAM,
      'evt-cb-trip1',
      makeTestEvent('evt-cb-trip1'),
    );
    await pushTestEventToStream(
      redis,
      TestMessagingStream.TEST_STREAM,
      'evt-cb-trip2',
      makeTestEvent('evt-cb-trip2'),
    );

    cbProcessor.processError = new Error('Simulated down stream');
    await cbProcessor.start();

    // Verify circuit trips to OPEN
    await waitFor(
      () => cbProcessor.getCircuitBreaker().getDiagnostics().state === CircuitBreakerState.OPEN,
      3000,
    );
    expect(cbProcessor.getCircuitBreaker().getDiagnostics().state).toBe(CircuitBreakerState.OPEN);

    cbProcessor.processError = null;

    // Wait for the resetTimeoutMs (1000ms) to pass so breaker moves to HALF_OPEN on next call
    await new Promise((resolve) => setTimeout(resolve, 1100));

    await pushTestEventToStream(
      redis,
      TestMessagingStream.TEST_STREAM,
      'evt-cb-probe',
      makeTestEvent('evt-cb-probe'),
    );

    // Verify circuit transitions back to CLOSED
    await waitFor(
      () => cbProcessor.getCircuitBreaker().getDiagnostics().state === CircuitBreakerState.CLOSED,
      3000,
    );
    expect(cbProcessor.getCircuitBreaker().getDiagnostics().state).toBe(CircuitBreakerState.CLOSED);

    await cbProcessor.stop();
  });
});
