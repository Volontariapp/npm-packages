import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { Redis } from 'ioredis';
import { testRedisOptions } from '../../redis-config.js';
import {
  TestPostProcessor,
  makeTestEvent,
  pushTestEventToStream,
  TestMessagingStream,
  TestMessagingGroup,
  TestMessagingConsumer,
} from '../../utils/index.js';

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
    await new Promise((resolve) => setTimeout(resolve, 200));

    expect(processor.processedEvents).toHaveLength(0);

    // Message should be in retry queue
    const retryQueueKey = `retry-queue:post-processor:${TestMessagingGroup.TEST_GROUP}`;
    const retryCount = await redis.zcard(retryQueueKey);
    expect(retryCount).toBe(1);

    // Clear error, retry should succeed
    processor.processError = null;

    // Wait for retry (initial delay 100ms + some buffer)
    await new Promise((resolve) => setTimeout(resolve, 300));

    expect(processor.processedEvents).toHaveLength(1);
    expect(processor.processedEvents[0]?.id).toBe('evt-retry-1');

    // Retry queue should be cleared
    const finalRetryCount = await redis.zcard(retryQueueKey);
    expect(finalRetryCount).toBe(0);
  });

  it('should respect exponential backoff delays', async () => {
    const eventPayload = makeTestEvent('evt-backoff-1');
    const messageId = await pushTestEventToStream(
      redis,
      TestMessagingStream.TEST_STREAM,
      'evt-backoff-1',
      eventPayload,
    );

    processor.processError = new Error('Simulated processing error');
    await processor.start();

    const baseMs = 100;
    let previousTimestamp: number | null = null;

    // Simulate 3 failures to see backoff progression
    for (let attempt = 0; attempt < 3; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 200));

      processor.processError = new Error('Continue failing');

      const retryKey = `retry:post-processor:${TestMessagingGroup.TEST_GROUP}:${messageId}:attempt`;
      const attemptCount = await redis.get(retryKey);
      expect(Number(attemptCount)).toBe(attempt + 1);

      // Get next retry timestamp from sorted set
      const retryQueueKey = `retry-queue:post-processor:${TestMessagingGroup.TEST_GROUP}`;
      const entries = await redis.zrange(retryQueueKey, 0, -1, 'WITHSCORES');

      if (entries.length >= 2) {
        const nextTimestamp = Number(entries[1]);
        if (previousTimestamp !== null) {
          const delayDiff = nextTimestamp - previousTimestamp;
          // Each delay should be approximately 2x the previous (backoffMultiplier=2)
          // Allow some tolerance for test timing
          expect(delayDiff).toBeGreaterThanOrEqual(baseMs * Math.pow(2, attempt) - 50);
          expect(delayDiff).toBeLessThanOrEqual(baseMs * Math.pow(2, attempt) + 100);
        }
        previousTimestamp = nextTimestamp;
      }
    }
  });

  it('should send message to DLQ after max retries exceeded', async () => {
    const eventPayload = makeTestEvent('evt-dlq-1');
    await pushTestEventToStream(redis, TestMessagingStream.TEST_STREAM, 'evt-dlq-1', eventPayload);

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

    // Convert array to object
    const dlqObject: Record<string, string> = {};
    for (let i = 0; i < dlqFields.length; i += 2) {
      dlqObject[dlqFields[i]] = dlqFields[i + 1];
    }

    expect(dlqObject.messageId).toBe('evt-dlq-1');
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

    // First attempt fails
    processor.processError = new Error('Simulated error');
    await processor.start();
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Verify retry data exists
    const retryKey = `retry:post-processor:${TestMessagingGroup.TEST_GROUP}:${messageId}:attempt`;
    let attemptCount = await redis.get(retryKey);
    expect(attemptCount).toBe('1');

    // Clear error, let it succeed
    processor.processError = null;
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Verify retry data is cleared
    attemptCount = await redis.get(retryKey);
    expect(attemptCount).toBeNull();

    // Event should be processed
    expect(processor.processedEvents).toHaveLength(1);
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
