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
  type RedisXPendingSummary,
} from '../../utils/index.js';

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
      claimIntervalMs: 500,
      claimMinIdleTimeMs: 100,
      blockMs: 50,
    });
  });

  afterEach(async () => {
    await processor.stop();
  });

  it('should successfully read, process, and acknowledge events from a real Redis Stream', async () => {
    const eventPayload = makeTestEvent('evt-int-1');

    await pushTestEventToStream(redis, TestMessagingStream.TEST_STREAM, 'evt-int-1', eventPayload);

    await processor.start();

    await new Promise((resolve) => setTimeout(resolve, 200));

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
    await new Promise((resolve) => setTimeout(resolve, 200));

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
    await new Promise((resolve) => setTimeout(resolve, 200));

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
    await new Promise((resolve) => setTimeout(resolve, 200));

    expect(processor.processedEvents).toHaveLength(0);

    const idempotencyKey = `idempotency:post-processor:${TestMessagingGroup.TEST_GROUP}:${messageId}`;
    const lockVal = await redis.get(idempotencyKey);
    expect(lockVal).toBeNull();
  });
});
