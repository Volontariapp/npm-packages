import { describe, it, expect, beforeEach, afterAll, beforeAll } from '@jest/globals';
import { Redis } from 'ioredis';
import { testRedisOptions } from '../../../redis-config.js';
import {
  IdempotencyLockState,
  RedisStreamHelper,
} from '../../../../core/helpers/redis-stream.helper.js';

describe('RedisStreamHelper — Integration', () => {
  let redis: Redis;

  beforeAll(() => {
    redis = new Redis(testRedisOptions);
  });

  afterAll(async () => {
    await redis.quit();
  });

  beforeEach(async () => {
    await redis.flushdb();
  });

  it('should manage idempotency locks with acquire/remove operations in a real Redis database', async () => {
    const groupName = 'test-group';
    const messageId = '1-0';
    const ttl = 10;

    // Acquire lock for the first time should succeed
    const firstAcquire = await RedisStreamHelper.acquireIdempotencyLock(
      redis,
      groupName,
      messageId,
      ttl,
    );
    expect(firstAcquire).toBe(true);

    // Verify key exists and value is "processing"
    const key = RedisStreamHelper.getIdempotencyKey(groupName, messageId);
    const value = await redis.get(key);
    expect(value).toBe('processing');

    // Second acquire attempt should fail
    const secondAcquire = await RedisStreamHelper.acquireIdempotencyLock(
      redis,
      groupName,
      messageId,
      ttl,
    );
    expect(secondAcquire).toBe(false);

    // Remove lock
    await RedisStreamHelper.removeIdempotencyLock(redis, groupName, messageId);

    // Key should be gone
    const valueAfterRemoval = await redis.get(key);
    expect(valueAfterRemoval).toBeNull();

    // Acquire lock should succeed again
    const thirdAcquire = await RedisStreamHelper.acquireIdempotencyLock(
      redis,
      groupName,
      messageId,
      ttl,
    );
    expect(thirdAcquire).toBe(true);
  });

  describe('event id idempotency locks', () => {
    const groupName = 'test-group';

    it('acquires each event id once, and reports the second request as processing', async () => {
      const states = await RedisStreamHelper.acquireIdempotencyLocks(
        redis,
        groupName,
        [
          { idempotencyId: 'evt-1', legacyMessageId: '1-0' },
          { idempotencyId: 'evt-2', legacyMessageId: '2-0' },
          { idempotencyId: 'evt-1', legacyMessageId: '3-0' },
        ],
        60,
      );

      expect(states).toEqual([
        IdempotencyLockState.ACQUIRED,
        IdempotencyLockState.ACQUIRED,
        IdempotencyLockState.PROCESSING,
      ]);
      expect(await redis.get(RedisStreamHelper.getIdempotencyKey(groupName, 'evt-1'))).toBe(
        'processing',
      );
      expect(await redis.ttl(RedisStreamHelper.getIdempotencyKey(groupName, 'evt-1'))).toBe(60);
    });

    it('reports a processed event as done, with the long ttl', async () => {
      await RedisStreamHelper.acquireIdempotencyLocks(
        redis,
        groupName,
        [{ idempotencyId: 'evt-1' }],
        60,
      );
      await RedisStreamHelper.markIdempotencyDone(redis, groupName, ['evt-1'], 86400);

      const states = await RedisStreamHelper.acquireIdempotencyLocks(
        redis,
        groupName,
        [{ idempotencyId: 'evt-1', legacyMessageId: '9-0' }],
        60,
      );

      expect(states).toEqual([IdempotencyLockState.DONE]);
      expect(await redis.ttl(RedisStreamHelper.getIdempotencyKey(groupName, 'evt-1'))).toBe(86400);
    });

    it('lets an event be processed again once its processing lock has expired', async () => {
      await RedisStreamHelper.acquireIdempotencyLocks(
        redis,
        groupName,
        [{ idempotencyId: 'evt-1' }],
        1,
      );
      await new Promise((resolve) => setTimeout(resolve, 1100));

      const states = await RedisStreamHelper.acquireIdempotencyLocks(
        redis,
        groupName,
        [{ idempotencyId: 'evt-1' }],
        1,
      );

      expect(states).toEqual([IdempotencyLockState.ACQUIRED]);
    });

    it('treats a key of the previous version (Redis message id) as done, without taking the new lock', async () => {
      await redis.set(RedisStreamHelper.getIdempotencyKey(groupName, '1-0'), 'processing');

      const states = await RedisStreamHelper.acquireIdempotencyLocks(
        redis,
        groupName,
        [{ idempotencyId: 'evt-1', legacyMessageId: '1-0' }],
        60,
      );

      expect(states).toEqual([IdempotencyLockState.DONE]);
      expect(await redis.get(RedisStreamHelper.getIdempotencyKey(groupName, 'evt-1'))).toBeNull();
    });
  });

  it('should interact with Redis streams to get and claim pending messages', async () => {
    const streamName = 'stream:test-helper';
    const groupName = 'group:test-helper';
    const consumerName1 = 'consumer-1';
    const consumerName2 = 'consumer-2';

    // Create stream and consumer group
    await redis.xgroup('CREATE', streamName, groupName, '$', 'MKSTREAM');

    // Add event to stream
    const messageId = await redis.xadd(streamName, '*', 'key', 'value');
    expect(messageId).not.toBeNull();
    if (!messageId) {
      throw new Error('xadd failed to return a valid messageId');
    }

    // Read the event via consumer-1 to put it in the pending entries list (PEL)
    await redis.xreadgroup(
      'GROUP',
      groupName,
      consumerName1,
      'COUNT',
      1,
      'STREAMS',
      streamName,
      '>',
    );

    // Get pending messages
    const pendingList = await RedisStreamHelper.getPendingMessages(
      redis,
      streamName,
      groupName,
      10,
    );
    expect(pendingList).toHaveLength(1);
    expect(pendingList[0]?.messageId).toBe(messageId);
    expect(pendingList[0]?.consumerName).toBe(consumerName1);
    expect(pendingList[0]?.deliveryCount).toBe(1);

    // Claim message by consumer-2
    await RedisStreamHelper.claimMessage(
      redis,
      streamName,
      groupName,
      consumerName2,
      0, // idle time 0 to claim immediately
      messageId,
    );

    // Verify it is claimed by consumer-2
    const pendingListAfterClaim = await RedisStreamHelper.getPendingMessages(
      redis,
      streamName,
      groupName,
      10,
    );
    expect(pendingListAfterClaim).toHaveLength(1);
    expect(pendingListAfterClaim[0]?.consumerName).toBe(consumerName2);
  });
});
