import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { Redis } from 'ioredis';
import { testRedisOptions } from '../../redis-config.js';
import {
  TestBatchPostProcessor,
  makeTestEvent,
  pushTestEventToStream,
  TestMessagingStream,
  TestMessagingGroup,
  TestMessagingConsumer,
  type RedisXPendingSummary,
} from '../../utils/index.js';

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
      claimIntervalMs: 500,
      claimMinIdleTimeMs: 100,
      blockMs: 50,
      batchSize: 10,
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
    expect(Number(pendingInfo[0])).toBe(0);
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

    const key1 = `idempotency:post-processor:${TestMessagingGroup.TEST_GROUP}:${msgId1}`;
    const key2 = `idempotency:post-processor:${TestMessagingGroup.TEST_GROUP}:${msgId2}`;

    expect(await redis.get(key1)).toBeNull();
    expect(await redis.get(key2)).toBeNull();
  });
});
