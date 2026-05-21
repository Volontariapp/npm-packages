import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import type { Repository } from 'typeorm';
import { Redis } from 'ioredis';
import { databaseMapper, EventQueueModel, EventQueueEntity } from '@volontariapp/database';
import { Logger } from '@volontariapp/logger';
import type { ServiceType } from '@volontariapp/shared';
import { testDataSource, initializeTestDb, closeTestDb } from '../../../data-source.js';
import { testRedisOptions } from '../../../redis-config.js';
import {
  E2ESinglePostProcessor,
  pushDbEvent,
  startOutboxLoop,
  waitFor,
} from '../../../utils/index.js';

describe('Multiple Post-Processors E2E Integration Flow', () => {
  let redis: Redis;
  let repository: Repository<EventQueueModel>;
  let outboxInterval: NodeJS.Timeout | null = null;
  const testLogger = new Logger({ context: 'E2E-Multiple' });
  const processors: E2ESinglePostProcessor[] = [];

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

    outboxInterval = startOutboxLoop(repository, redis, testLogger);
  });

  afterEach(async () => {
    if (outboxInterval) {
      clearInterval(outboxInterval);
      outboxInterval = null;
    }
    for (const processor of processors) {
      await processor.stop().catch(() => undefined);
    }
    processors.length = 0;
  });

  it('should support multiple consumer groups consuming the same stream independently', async () => {
    const streamName = 'stream:shared-service';

    const processorA = new E2ESinglePostProcessor(redis, {
      streamName,
      groupName: 'group:service-a',
      consumerName: 'consumer:a-1',
      claimIntervalMs: 100,
      claimMinIdleTimeMs: 100,
      blockMs: 50,
    });
    processors.push(processorA);

    const processorB = new E2ESinglePostProcessor(redis, {
      streamName,
      groupName: 'group:service-b',
      consumerName: 'consumer:b-1',
      claimIntervalMs: 100,
      claimMinIdleTimeMs: 100,
      blockMs: 50,
    });
    processors.push(processorB);

    // Push 5 events targeted to both services
    for (let i = 1; i <= 5; i++) {
      const eventId = `00000000-0000-0000-0000-00000000000${String(i)}`;
      await pushDbEvent(repository, redis, testLogger, eventId, 'event.changed', [
        'shared-service' as ServiceType,
      ]);
    }

    await processorA.start();
    await processorB.start();

    // Both processors should process all 5 events
    await waitFor(() => {
      return processorA.processedEvents.length === 5 && processorB.processedEvents.length === 5;
    }, 5000);

    expect(processorA.processedEvents.length).toBe(5);
    expect(processorB.processedEvents.length).toBe(5);

    const idsA = processorA.processedEvents.map((e) => e.event.id).sort();
    const idsB = processorB.processedEvents.map((e) => e.event.id).sort();

    expect(idsA).toEqual(idsB);
  });

  it('should load balance correctly with three competing consumers in the same group', async () => {
    const streamName = 'stream:shared-service';
    const groupName = 'group:competing-e2e';

    const p1 = new E2ESinglePostProcessor(redis, {
      streamName,
      groupName,
      consumerName: 'consumer:c-1',
      claimIntervalMs: 100,
      claimMinIdleTimeMs: 100,
      blockMs: 50,
    });
    processors.push(p1);

    const p2 = new E2ESinglePostProcessor(redis, {
      streamName,
      groupName,
      consumerName: 'consumer:c-2',
      claimIntervalMs: 100,
      claimMinIdleTimeMs: 100,
      blockMs: 50,
    });
    processors.push(p2);

    const p3 = new E2ESinglePostProcessor(redis, {
      streamName,
      groupName,
      consumerName: 'consumer:c-3',
      claimIntervalMs: 100,
      claimMinIdleTimeMs: 100,
      blockMs: 50,
    });
    processors.push(p3);

    // Push 12 events
    for (let i = 1; i <= 12; i++) {
      const eventId = `00000000-0000-0000-0000-0000000000${(10 + i).toString()}`;
      await pushDbEvent(repository, redis, testLogger, eventId, 'event.changed', [
        'shared-service' as ServiceType,
      ]);
    }

    await p1.start();
    await p2.start();
    await p3.start();

    // All 12 events should be processed exactly once
    await waitFor(() => {
      const total =
        p1.processedEvents.length + p2.processedEvents.length + p3.processedEvents.length;
      return total === 12;
    }, 6000);

    expect(p1.processedEvents.length + p2.processedEvents.length + p3.processedEvents.length).toBe(
      12,
    );

    const allIds = [
      ...p1.processedEvents.map((e) => e.event.id),
      ...p2.processedEvents.map((e) => e.event.id),
      ...p3.processedEvents.map((e) => e.event.id),
    ];
    // All 12 messages processed exactly once — no duplicates
    expect(new Set(allIds).size).toBe(12);
  });

  it('should support pending claim execution when one of the consumers crashes', async () => {
    const streamName = 'stream:shared-service';
    const groupName = 'group:claim-e2e';

    const slowProcessor = new E2ESinglePostProcessor(redis, {
      streamName,
      groupName,
      consumerName: 'consumer:slow-1',
      claimIntervalMs: 5000,
      claimMinIdleTimeMs: 5000,
      blockMs: 50,
    });
    processors.push(slowProcessor);

    const claimProcessor = new E2ESinglePostProcessor(redis, {
      streamName,
      groupName,
      consumerName: 'consumer:claim-1',
      claimIntervalMs: 50,
      claimMinIdleTimeMs: 100,
      blockMs: 50,
    });
    processors.push(claimProcessor);

    // Push 1 event
    const eventId = '00000000-0000-0000-0000-000000000030';
    await pushDbEvent(repository, redis, testLogger, eventId, 'event.changed', [
      'shared-service' as ServiceType,
    ]);

    // Make slowProcessor block on processEvent for a fixed time before failing,
    // so the message remains unacknowledged and becomes claimable.
    slowProcessor.processError = new Error('Simulated slow crash');

    await slowProcessor.start();

    // Wait until the message is in the pending set (slowProcessor fetched it)
    await waitFor(async () => {
      const pending = await redis.xpending(streamName, groupName, '-', '+', 10);
      return pending.length === 1;
    }, 5000);

    // Stop slowProcessor to simulate a crash — message stays unacknowledged
    await slowProcessor.stop();

    // claimMinIdleTimeMs: 100 — wait a bit so the message becomes idle
    await new Promise<void>((resolve) => setTimeout(resolve, 200));

    // Start claiming processor
    await claimProcessor.start();

    // The claimProcessor should detect the unacknowledged message, claim it, and process it
    await waitFor(() => claimProcessor.processedEvents.length === 1, 5000);

    expect(claimProcessor.processedEvents[0].event.id).toBe(eventId);
  });

  it('should isolate failures so that one failing group does not affect another succeeding group, routing to DLQ', async () => {
    const streamName = 'stream:shared-service';

    const failingProcessor = new E2ESinglePostProcessor(redis, {
      streamName,
      groupName: 'group:fail-group',
      consumerName: 'consumer:fail-1',
      claimIntervalMs: 100,
      claimMinIdleTimeMs: 100,
      blockMs: 50,
      retry: {
        maxRetries: 0,
        initialDelayMs: 50,
        maxDelayMs: 100,
        backoffMultiplier: 1.5,
        enableDlq: true,
      },
    });
    processors.push(failingProcessor);

    const succeedingProcessor = new E2ESinglePostProcessor(redis, {
      streamName,
      groupName: 'group:success-group',
      consumerName: 'consumer:success-1',
      claimIntervalMs: 100,
      claimMinIdleTimeMs: 100,
      blockMs: 50,
    });
    processors.push(succeedingProcessor);

    // Push 1 event
    const eventId = '00000000-0000-0000-0000-000000000040';
    await pushDbEvent(repository, redis, testLogger, eventId, 'event.changed', [
      'shared-service' as ServiceType,
    ]);

    // Force failingProcessor to fail
    failingProcessor.processError = new Error('Persistent failure for FailGroup');

    await failingProcessor.start();
    await succeedingProcessor.start();

    // succeedingProcessor should process successfully
    await waitFor(() => succeedingProcessor.processedEvents.length === 1, 5000);
    expect(succeedingProcessor.processedEvents[0].event.id).toBe(eventId);

    // failingProcessor should fail and move to DLQ
    const dlqStreamName = 'stream:shared-service-dlq';
    await waitFor(async () => {
      const xrange = await redis.xrange(dlqStreamName, '-', '+');
      return xrange.length === 1;
    }, 5000);

    expect(failingProcessor.processedEvents.length).toBe(0);

    // Verify DLQ contents have the error details
    const xrange = await redis.xrange(dlqStreamName, '-', '+');
    const dlqFields = xrange[0][1];
    const dlqObj: Record<string, string> = {};
    for (let i = 0; i < dlqFields.length; i += 2) {
      dlqObj[dlqFields[i]] = dlqFields[i + 1];
    }
    expect(dlqObj.error).toContain('Persistent failure for FailGroup');
  });

  it('should push a job to outbox, route it to multiple target streams, and process them with multiple post-processors', async () => {
    const processorA = new E2ESinglePostProcessor(redis, {
      streamName: 'stream:service-a',
      groupName: 'group:service-a-e2e',
      consumerName: 'consumer:a-1',
      claimIntervalMs: 100,
      claimMinIdleTimeMs: 100,
      blockMs: 50,
    });
    processors.push(processorA);

    const processorB = new E2ESinglePostProcessor(redis, {
      streamName: 'stream:service-b',
      groupName: 'group:service-b-e2e',
      consumerName: 'consumer:b-1',
      claimIntervalMs: 100,
      claimMinIdleTimeMs: 100,
      blockMs: 50,
    });
    processors.push(processorB);

    // Push 1 event targeting service-a and service-b
    const eventId = '00000000-0000-0000-0000-000000000050';
    await pushDbEvent(repository, redis, testLogger, eventId, 'event.changed', [
      'service-a' as ServiceType,
      'service-b' as ServiceType,
    ]);

    await processorA.start();
    await processorB.start();

    // Both should process the event
    await waitFor(() => {
      return processorA.processedEvents.length === 1 && processorB.processedEvents.length === 1;
    }, 5000);

    expect(processorA.processedEvents[0].event.id).toBe(eventId);
    expect(processorB.processedEvents[0].event.id).toBe(eventId);
  });
});
