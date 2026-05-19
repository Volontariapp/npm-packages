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
import { testRedisOptions } from '../../redis-config.js';
import {
  TestPostProcessor,
  makeTestEvent,
  pushTestEventToStream,
  TestMessagingStream,
  TestMessagingGroup,
  TestMessagingConsumer,
  waitFor,
} from '../../utils/index.js';
import type { ParseSuccess } from '../../../index.js';

describe('SinglePostProcessor — Retry & Exponential Backoff', () => {
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
      claimIntervalMs: 100, // Frequent retry checks for testing
      claimMinIdleTimeMs: 50,
      blockMs: 50,
      circuitBreaker: {
        failureThreshold: 20, // Set high to prevent CB interference during retry tests
        resetTimeoutMs: 10000,
        successThreshold: 1,
      },
      retry: {
        maxRetries: 3,
        initialDelayMs: 100,
        maxDelayMs: 5000,
        backoffMultiplier: 2,
        enableDlq: true,
      },
    });
  });

  afterEach(async () => {
    await processor.stop();
  });

  it('should retry a failed message with exponential backoff', async () => {
    const eventPayload = makeTestEvent('evt-retry-1');
    await pushTestEventToStream(
      redis,
      TestMessagingStream.TEST_STREAM,
      'evt-retry-1',
      eventPayload,
    );

    // First attempt fails
    processor.processError = new Error('Simulated processing error');
    await processor.start();

    // Wait for the message to be in the retry queue
    const retryQueueKey = `retry-queue:post-processor:${TestMessagingGroup.TEST_GROUP}`;
    await waitFor(async () => {
      const retryCount = await redis.zcard(retryQueueKey);
      return retryCount === 1;
    });

    expect(processor.processedEvents).toHaveLength(0);

    // Clear error, retry should succeed
    processor.processError = null;

    // Wait for retry to succeed
    await waitFor(() => processor.processedEvents.length === 1);

    expect(processor.processedEvents[0]?.id).toBe('evt-retry-1');

    // Retry queue should be cleared
    const finalRetryCount = await redis.zcard(retryQueueKey);
    expect(finalRetryCount).toBe(0);
  });

  it('should respect exponential backoff delays', async () => {
    const eventPayload = makeTestEvent('evt-backoff-1');
    await pushTestEventToStream(
      redis,
      TestMessagingStream.TEST_STREAM,
      'evt-backoff-1',
      eventPayload,
    );

    const retryHelper = processor['retryHelper'];
    const calculateDelaySpy = jest.spyOn(retryHelper, 'calculateDelay');

    processor.processError = new Error('Simulated processing error');
    await processor.start();

    // Wait until the spy has been called at least 4 times (2 calls per retry attempt, for 2 retry attempts)
    await waitFor(() => calculateDelaySpy.mock.calls.length >= 4);

    // Check the spy calls
    expect(calculateDelaySpy.mock.calls.length).toBeGreaterThanOrEqual(4);

    // First retry attempt: attemptCount=1, delay=200ms
    expect(calculateDelaySpy).toHaveBeenNthCalledWith(1, 1);
    expect(calculateDelaySpy.mock.results[0]?.value).toBe(200);
    expect(calculateDelaySpy).toHaveBeenNthCalledWith(2, 1);
    expect(calculateDelaySpy.mock.results[1]?.value).toBe(200);

    // Second retry attempt: attemptCount=2, delay=400ms
    expect(calculateDelaySpy).toHaveBeenNthCalledWith(3, 2);
    expect(calculateDelaySpy.mock.results[2]?.value).toBe(400);
    expect(calculateDelaySpy).toHaveBeenNthCalledWith(4, 2);
    expect(calculateDelaySpy.mock.results[3]?.value).toBe(400);

    calculateDelaySpy.mockRestore();
  });

  it('should send message to DLQ after max retries exceeded', async () => {
    const eventPayload = makeTestEvent('evt-dlq-1');
    const messageId = await pushTestEventToStream(
      redis,
      TestMessagingStream.TEST_STREAM,
      'evt-dlq-1',
      eventPayload,
    );

    processor.processError = new Error('Persistent processing error');
    await processor.start();

    // Let it fail multiple times (maxRetries = 3)
    for (let i = 0; i < 5; i++) {
      await new Promise((resolve) => setTimeout(resolve, 250));
    }

    processor.processError = null; // Stop throwing errors

    // Check DLQ stream
    const dlqStreamName = `${TestMessagingStream.TEST_STREAM}-dlq`;
    const dlqEntries = (await redis.xrange(dlqStreamName, '-', '+')) as [string, string[]][];

    expect(dlqEntries.length).toBeGreaterThan(0);
    const dlqEntry = dlqEntries[0];
    const dlqFields = dlqEntry[1];

    const dlqObject: Record<string, string> = {};
    for (let i = 0; i < dlqFields.length; i += 2) {
      const key = dlqFields[i];
      const val = dlqFields[i + 1];
      dlqObject[key] = val;
    }

    expect(dlqObject.messageId).toBe(messageId);
    const parsedPayload = JSON.parse(dlqObject.payload || '{}') as ParseSuccess;
    expect(parsedPayload.id).toBe('evt-dlq-1');
    expect(dlqObject.error).toContain('Persistent processing error');
  });

  it('should clear retry data on successful processing', async () => {
    const eventPayload = makeTestEvent('evt-retry-clear-1');
    const messageId = await pushTestEventToStream(
      redis,
      TestMessagingStream.TEST_STREAM,
      'evt-retry-clear-1',
      eventPayload,
    );

    processor.processError = new Error('Simulated error');
    await processor.start();

    const retryKey = `retry:post-processor:${TestMessagingGroup.TEST_GROUP}:${messageId}:attempt`;

    // Wait for the first failure
    await waitFor(async () => {
      const attemptCount = await redis.get(retryKey);
      return attemptCount === '1';
    });

    processor.processError = null;

    // Wait for successful processing
    await waitFor(() => processor.processedEvents.length === 1);

    const attemptCount = await redis.get(retryKey);
    expect(attemptCount).toBeNull();
  });

  it('should not retry when retry is disabled', async () => {
    await processor.stop(); // Stop the default processor

    // Create processor with retry disabled
    const noRetryProcessor = new TestPostProcessor(redis, {
      streamName: TestMessagingStream.TEST_STREAM,
      groupName: TestMessagingGroup.TEST_GROUP,
      consumerName: TestMessagingConsumer.TEST_CONSUMER,
      claimIntervalMs: 100,
      blockMs: 50,
      circuitBreaker: {
        failureThreshold: 20,
      },
      retry: {
        maxRetries: 0, // Disable retries
      },
    });

    const eventPayload = makeTestEvent('evt-no-retry-1');
    await pushTestEventToStream(
      redis,
      TestMessagingStream.TEST_STREAM,
      'evt-no-retry-1',
      eventPayload,
    );

    noRetryProcessor.processError = new Error('Processing failed');
    await noRetryProcessor.start();
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Should be sent to DLQ immediately
    const dlqStreamName = `${TestMessagingStream.TEST_STREAM}-dlq`;
    const dlqEntries = (await redis.xrange(dlqStreamName, '-', '+')) as [string, string[]][];
    expect(dlqEntries.length).toBeGreaterThan(0);

    await noRetryProcessor.stop();
  });
});
