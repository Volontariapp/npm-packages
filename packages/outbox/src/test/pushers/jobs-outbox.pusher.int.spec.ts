import { describe, expect, it, beforeEach, afterAll, afterEach } from '@jest/globals';
import { JobsOutboxPusher } from '../../pushers/jobs-outbox.pusher.js';
import { makeLoggerMock } from '../utils/helpers/logger-mock.helper.js';
import { makeJobsOutboxEvent } from '../utils/helpers/jobs-outbox-event.helper.js';
import { testRedisConfig, testRedisOptions, clearTestRedis } from '../redis-config.js';
import { Queue } from 'bullmq';

describe('JobsOutboxPusher (Integration)', () => {
  let pusher: JobsOutboxPusher;
  const logger = makeLoggerMock();

  beforeEach(async () => {
    await clearTestRedis();
    pusher = new JobsOutboxPusher(logger, testRedisConfig);
  });

  afterEach(async () => {
    await pusher.close();
  });

  afterAll(async () => {
    await clearTestRedis();
  });

  it('pushElement() should actually enqueue a job in Redis', async () => {
    const target = 'integration-test-target';
    const entity = makeJobsOutboxEvent({
      id: 'int-1',
      type: 'test.job',
      payload: { foo: 'bar' },
      target,
      scheduledAt: undefined, // Ensure no delay
    });

    await pusher.pushElement(entity);

    const inspectorQueue = new Queue(target, { connection: testRedisOptions });
    try {
      const job = await inspectorQueue.getJob('int-1');

      expect(job).toBeDefined();
      expect(job?.name).toBe('test.job');
      expect(job?.data).toEqual({ foo: 'bar' });
    } finally {
      await inspectorQueue.close();
    }
  });

  it('pushBulkElement() should enqueue multiple jobs in Redis across targets', async () => {
    const targetA = 'target-a';
    const targetB = 'target-b';

    const entities = [
      makeJobsOutboxEvent({
        id: 'bulk-1',
        type: 'job.a1',
        target: targetA,
        payload: { p: 1 },
        scheduledAt: undefined,
      }),
      makeJobsOutboxEvent({
        id: 'bulk-2',
        type: 'job.b1',
        target: targetB,
        payload: { p: 2 },
        scheduledAt: undefined,
      }),
      makeJobsOutboxEvent({
        id: 'bulk-3',
        type: 'job.a2',
        target: targetA,
        payload: { p: 3 },
        scheduledAt: undefined,
      }),
    ];

    await pusher.pushBulkElement(entities);

    const queueA = new Queue(targetA, { connection: testRedisOptions });
    const queueB = new Queue(targetB, { connection: testRedisOptions });

    try {
      const job1 = await queueA.getJob('bulk-1');
      const job3 = await queueA.getJob('bulk-3');
      const job2 = await queueB.getJob('bulk-2');

      expect(job1).toBeDefined();
      expect(job3).toBeDefined();
      expect(job2).toBeDefined();
    } finally {
      await queueA.close();
      await queueB.close();
    }
  });

  it('should handle scheduled jobs with delay', async () => {
    const target = 'delay-test-target';
    const futureDate = new Date(Date.now() + 5000);
    const entity = makeJobsOutboxEvent({
      id: 'delayed-1',
      target,
      scheduledAt: futureDate,
    });

    await pusher.pushElement(entity);

    const inspectorQueue = new Queue(target, { connection: testRedisOptions });
    try {
      const job = await inspectorQueue.getJob('delayed-1');

      expect(job).toBeDefined();
      // Using optional chaining satisfies linter and fails test correctly if job is undefined
      const state = await job?.getState();
      expect(state).toBe('delayed');
    } finally {
      await inspectorQueue.close();
    }
  });

  it('pushElement() should throw error if Redis connection is disconnected', async () => {
    const target = 'failure-test-target';
    const entity = makeJobsOutboxEvent({
      id: 'fail-1',
      target,
    });

    // Ensure queue is created
    await pusher.pushElement(entity);

    // Get the internal queue and disconnect its client
    const queues = (pusher as unknown as { queues: Map<string, Queue> }).queues;
    const queue = queues.get(target) as Queue;
    const client = await queue.client;
    client.disconnect();

    const entity2 = makeJobsOutboxEvent({
      id: 'fail-2',
      target,
    });

    await expect(pusher.pushElement(entity2)).rejects.toThrow();
  });

  it('pushBulkElement() should throw error if Redis connection is disconnected', async () => {
    const target = 'failure-bulk-test-target';
    const entity = makeJobsOutboxEvent({
      id: 'fail-bulk-1',
      target,
    });

    // Ensure queue is created
    await pusher.pushElement(entity);

    // Get the internal queue and disconnect its client
    const queues = (pusher as unknown as { queues: Map<string, Queue> }).queues;
    const queue = queues.get(target) as Queue;
    const client = await queue.client;
    client.disconnect();

    const entities = [
      makeJobsOutboxEvent({
        id: 'fail-bulk-2',
        target,
      }),
    ];

    await expect(pusher.pushBulkElement(entities)).rejects.toThrow();
  });
});
