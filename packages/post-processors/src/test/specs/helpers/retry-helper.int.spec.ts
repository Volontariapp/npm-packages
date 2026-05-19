import { describe, it, expect, beforeEach, afterAll, beforeAll } from '@jest/globals';
import { Redis } from 'ioredis';
import { testRedisOptions } from '../../redis-config.js';
import { RetryHelper } from '../../../core/helpers/retry.helper.js';
import type { ParseResult } from '../../../types/index.js';

describe('RetryHelper — Integration', () => {
  let redis: Redis;
  let helper: RetryHelper;

  beforeAll(() => {
    redis = new Redis(testRedisOptions);
  });

  afterAll(async () => {
    await redis.quit();
  });

  beforeEach(async () => {
    await redis.flushdb();
    helper = new RetryHelper({
      maxRetries: 3,
      initialDelayMs: 50,
      maxDelayMs: 200,
      backoffMultiplier: 2,
      enableDlq: true,
    });
  });

  it('should record, fetch, and clear retry metadata in a real Redis database', async () => {
    const groupName = 'test-group';
    const messageId = '1-0';
    const err = new Error('Connection timeout');

    // Initially no metadata should exist
    const initialMeta = await helper.getRetryMetadata(redis, groupName, messageId);
    expect(initialMeta).toBeNull();

    // Record first retry
    const firstAttempt = await helper.recordRetry(redis, groupName, messageId, err);
    expect(firstAttempt).toBe(1);

    // Fetch and check metadata
    const meta1 = await helper.getRetryMetadata(redis, groupName, messageId);
    expect(meta1).not.toBeNull();
    if (meta1) {
      expect(meta1.attemptCount).toBe(1);
      expect(meta1.lastError).toBe('Connection timeout');
      expect(meta1.nextRetryTimestamp).toBeGreaterThan(Date.now());
    }

    // Record second retry
    const secondAttempt = await helper.recordRetry(
      redis,
      groupName,
      messageId,
      new Error('Auth failure'),
    );
    expect(secondAttempt).toBe(2);

    const meta2 = await helper.getRetryMetadata(redis, groupName, messageId);
    expect(meta2).not.toBeNull();
    if (meta2) {
      expect(meta2.attemptCount).toBe(2);
      expect(meta2.lastError).toBe('Auth failure');
    }

    // Clear data
    await helper.clearRetryData(redis, groupName, messageId);

    // Metadata should be removed
    const finalMeta = await helper.getRetryMetadata(redis, groupName, messageId);
    expect(finalMeta).toBeNull();
  });

  it('should manage retry queue and fetch ready messages using real Redis sorted sets', async () => {
    const groupName = 'test-group';
    const messageId1 = '1-0';
    const messageId2 = '2-0';

    // Enqueue message 1 with delay (attempt 1 -> delay 100ms)
    await helper.enqueueForRetry(redis, groupName, messageId1, 1);

    // Enqueue message 2 with delay (attempt 2 -> delay 200ms)
    await helper.enqueueForRetry(redis, groupName, messageId2, 2);

    // Initially, no messages should be ready because time hasn't passed
    const ready1 = await helper.getReadyForRetry(redis, groupName);
    expect(ready1).toHaveLength(0);

    // Wait 120ms (message 1 is ready, message 2 is not)
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 120);
    });

    const ready2 = await helper.getReadyForRetry(redis, groupName);
    expect(ready2).toEqual([messageId1]);

    // Check again immediately, message 1 should have been popped/removed already
    const ready3 = await helper.getReadyForRetry(redis, groupName);
    expect(ready3).toHaveLength(0);

    // Wait another 100ms (message 2 is now ready)
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 100);
    });

    const ready4 = await helper.getReadyForRetry(redis, groupName);
    expect(ready4).toEqual([messageId2]);
  });

  it('should push failed messages to DLQ stream in a real Redis instance', async () => {
    const dlqStream = 'test-stream-dlq';
    const messageId = '9-0';
    const payload: ParseResult = {
      success: true,
      id: 'evt-10',
      type: 'user.deleted',
      payload: JSON.stringify({ userId: 42 }),
    };
    const errorMsg = 'Failed permanently';

    const resultId = await helper.sendToDlq(redis, dlqStream, messageId, payload, errorMsg);
    expect(resultId).not.toBeNull();
    expect(typeof resultId).toBe('string');

    // Read from the DLQ stream to verify correct fields
    const rawResult = await redis.xread('COUNT', 1, 'STREAMS', dlqStream, '0');
    expect(rawResult).not.toBeNull();
    if (rawResult) {
      const streamInfo = rawResult[0];
      expect(streamInfo[0]).toBe(dlqStream);
      const entries = streamInfo[1];
      expect(entries).toHaveLength(1);
      const entry = entries[0];
      expect(entry[0]).toBe(resultId);
      const fields = entry[1];
      expect(fields).toContain(messageId);
      expect(fields).toContain(errorMsg);
      expect(fields).toContain(JSON.stringify(payload));
    }
  });
});
