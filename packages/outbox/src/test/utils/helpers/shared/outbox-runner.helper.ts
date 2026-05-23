import {
  databaseMapper,
  EventQueueEntity,
  EventQueueModel,
  JobsOutboxEntity,
  JobsOutboxModel,
  OutboxRunner,
  OutboxStatus,
} from '@volontariapp/database';
import { OutboxRunnerConfig } from '@volontariapp/config';
import type { Repository } from 'typeorm';
import { Redis } from 'ioredis';
import type { Queue } from 'bullmq';
import { EventQueueDispatcher } from '../../../../dispatchers/event-queue.dispatcher.js';
import { EventQueuePusher } from '../../../../pushers/event-queue.pusher.js';
import { JobsOutboxDispatcher } from '../../../../dispatchers/jobs-outbox.dispatcher.js';
import { JobsOutboxPusher } from '../../../../pushers/jobs-outbox.pusher.js';
import type { TestEventQueueRepository } from '../../repositories/event-queue-test.repository.js';
import type { TestJobsOutboxRepository } from '../../repositories/jobs-outbox-test.repository.js';
import { testRedisOptions } from '../../../redis-config.js';
import { makeLoggerMock } from './logger-mock.helper.js';
import type { LoggerMock } from './logger-mock.helper.js';

// ─── Primitives ──────────────────────────────────────────────────────────────

export const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export function makeRunnerConfig(batchIntervalMs = 20, batchSize = 50): OutboxRunnerConfig {
  const cfg = new OutboxRunnerConfig();
  cfg.batchIntervalMs = batchIntervalMs;
  cfg.batchSize = batchSize;
  cfg.logger = { context: 'OutboxRunnerTest', level: 'silent' } as never;
  return cfg;
}

export async function waitForStatus(
  repo: Repository<EventQueueModel> | Repository<JobsOutboxModel>,
  ids: string[],
  expectedStatus: OutboxStatus,
  timeoutMs = 3000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const rows = await (repo as Repository<EventQueueModel>).findBy(
      ids.map((id) => ({ id })) as never,
    );
    if (rows.length === ids.length && rows.every((r) => r.status === expectedStatus)) return;
    await sleep(30);
  }
  throw new Error(
    `Timeout: rows [${ids.join(', ')}] did not reach "${expectedStatus}" within ${timeoutMs.toString()}ms`,
  );
}

// ─── EventOutboxRunnerHarness ─────────────────────────────────────────────────

export class EventOutboxRunnerHarness {
  readonly pusher: EventQueuePusher;
  readonly logger: LoggerMock;
  private readonly runner: OutboxRunner<EventQueueModel, EventQueueEntity>;

  constructor(
    repo: TestEventQueueRepository,
    redis: Redis,
    logger?: LoggerMock,
    config?: OutboxRunnerConfig,
  ) {
    this.logger = logger ?? makeLoggerMock();
    this.pusher = new EventQueuePusher(this.logger, redis);
    const dispatcher = new EventQueueDispatcher(this.logger, repo);
    this.runner = new OutboxRunner(repo, config ?? makeRunnerConfig(), dispatcher, this.pusher);
    databaseMapper.registerBidirectional(EventQueueModel, EventQueueEntity);
  }

  static async createWithBrokenRedis(
    repo: TestEventQueueRepository,
    logger?: LoggerMock,
  ): Promise<EventOutboxRunnerHarness> {
    const brokenRedis = new Redis({ ...testRedisOptions, lazyConnect: true });
    await brokenRedis.connect();
    brokenRedis.disconnect();
    return new EventOutboxRunnerHarness(repo, brokenRedis, logger);
  }

  start(): void {
    this.runner.start();
  }

  async stop(): Promise<void> {
    await this.runner.stop();
  }

  async runCycle(): Promise<void> {
    await this.runner.runCycle();
  }
}

// ─── JobOutboxRunnerHarness ───────────────────────────────────────────────────

export class JobOutboxRunnerHarness {
  readonly pusher: JobsOutboxPusher;
  readonly logger: LoggerMock;
  private readonly runner: OutboxRunner<JobsOutboxModel, JobsOutboxEntity>;

  constructor(
    repo: TestJobsOutboxRepository,
    redis: Redis,
    logger?: LoggerMock,
    config?: OutboxRunnerConfig,
  ) {
    this.logger = logger ?? makeLoggerMock();
    this.pusher = new JobsOutboxPusher(this.logger, redis);
    const dispatcher = new JobsOutboxDispatcher(this.logger, repo);
    this.runner = new OutboxRunner(repo, config ?? makeRunnerConfig(), dispatcher, this.pusher);
    databaseMapper.registerBidirectional(JobsOutboxModel, JobsOutboxEntity);
  }

  /**
   * Creates a harness whose BullMQ queue for `target` has a disconnected client.
   * Warm-up enqueue is done internally before breaking the connection.
   */
  static async createWithBrokenQueue(
    repo: TestJobsOutboxRepository,
    target: string,
    logger?: LoggerMock,
  ): Promise<JobOutboxRunnerHarness> {
    const brokenRedis = new Redis({ ...testRedisOptions, lazyConnect: true });
    await brokenRedis.connect();
    const harness = new JobOutboxRunnerHarness(repo, brokenRedis, logger);

    const warmup = Object.assign(new JobsOutboxEntity(), {
      id: `warmup-${target}`,
      type: 'warmup.job',
      emitter: 'test-harness',
      emitterId: '00000000-0000-0000-0000-000000000000',
      target,
      payload: {},
      status: OutboxStatus.PENDING,
      attempts: 0,
      scheduledAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await harness.pusher.pushElement(warmup);

    const queues = (harness.pusher as unknown as { queues: Map<string, Queue> }).queues;
    const internalQueue = queues.get(target) as Queue;
    const client = await internalQueue.client;
    client.disconnect();

    return harness;
  }

  start(): void {
    this.runner.start();
  }

  async stop(): Promise<void> {
    await this.runner.stop();
    await this.pusher.close();
  }

  async runCycle(): Promise<void> {
    await this.runner.runCycle();
  }
}
