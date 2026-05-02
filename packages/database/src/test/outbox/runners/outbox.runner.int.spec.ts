import { describe, it, expect, beforeAll, beforeEach, afterEach, jest } from '@jest/globals';
import { testDataSource, setupIntegrationTest } from '../../utils/index.js';
import { EventQueueModel } from '../../../outbox/models/event-queue.model.js';
import { EventQueueEntity } from '../../../outbox/entities/event-queue.entity.js';
import { OutboxRunner } from '../../../outbox/runners/outbox.runner.js';
import { OutboxDispatcher } from '../../../outbox/dispatchers/outbox.dispatcher.js';
import { OutboxWriter } from '../../../outbox/writers/outbox.writer.js';
import { OutboxStatus } from '../../../outbox/types/outbox.status.js';
import { EventQueueTestRepository } from '../../utils/repositories/event-queue-test.repository.js';
import { makeLoggerMock, type LoggerMock } from '../../utils/helpers/logger-mock.helper.js';
import { makeOutboxEvent } from '../../utils/helpers/outbox-event.helper.js';
import { OutboxRunnerConfig, LoggerConfig, LoggerFormat } from '@volontariapp/config';
import { OutboxPusher } from '../../../outbox/pushers/outbox.pusher.js';
import type { Logger } from '@volontariapp/logger';

// Increase Jest timeout for integration tests
jest.setTimeout(60000);

class FakePusher<T extends EventQueueEntity> extends OutboxPusher<T> {
  public pushedItems: T[] = [];
  pushElement(entity: T): Promise<void> {
    this.pushedItems.push(entity);
    return Promise.resolve();
  }
  pushBulkElement(entities: T[]): Promise<void> {
    this.pushedItems.push(...entities);
    return Promise.resolve();
  }
}

describe('Outbox Flow (Integration)', () => {
  let repository: EventQueueTestRepository;
  let loggerMock: LoggerMock;
  let writer: OutboxWriter<EventQueueModel, EventQueueEntity>;
  let runner: OutboxRunner<EventQueueModel, EventQueueEntity>;
  let pusher: FakePusher<EventQueueEntity>;

  setupIntegrationTest([EventQueueModel]);

  beforeAll(() => {
    loggerMock = makeLoggerMock();
    repository = new EventQueueTestRepository(testDataSource.getRepository(EventQueueModel));
    writer = new OutboxWriter(loggerMock as unknown as Logger, repository);
  });

  beforeEach(() => {
    const config = new OutboxRunnerConfig();
    config.batchIntervalMs = 50;
    config.batchSize = 10;
    config.logger = new LoggerConfig();
    config.logger.format = LoggerFormat.JSON;
    config.logger.level = 'debug';

    const dispatcher = new OutboxDispatcher(loggerMock as unknown as Logger, repository);
    pusher = new FakePusher<EventQueueEntity>();
    runner = new OutboxRunner(repository, config, dispatcher, pusher);
    jest.clearAllMocks();
  });

  afterEach(async () => {
    if (runner.isRunning) {
      await runner.stop();
    }
  });

  it('should complete the whole flow for EventQueue: write -> run cycle -> push -> mark as completed', async () => {
    const repo = testDataSource.getRepository(EventQueueModel);

    const event = makeOutboxEvent<EventQueueEntity>(
      {
        id: '00000000-0000-0000-0000-000000000001',
        type: 'test.event',
        emitter: 'test-suite',
        status: OutboxStatus.PENDING,
        attempts: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
        payload: { after: { foo: 'bar' } },
      },
      () => new EventQueueEntity(),
    );

    await writer.create(event);

    let dbItem = await repo.findOneBy({ id: event.id });
    expect(dbItem).toBeDefined();
    expect(dbItem?.status).toBe(OutboxStatus.PENDING);

    // Run one cycle
    await runner.runCycle();

    dbItem = await repo.findOneBy({ id: event.id });
    expect(dbItem?.status).toBe(OutboxStatus.COMPLETED);
    expect(pusher.pushedItems).toHaveLength(1);
    expect(pusher.pushedItems[0].id).toBe(event.id);
  });

  it('should process multiple EventQueue items in the flow', async () => {
    const repo = testDataSource.getRepository(EventQueueModel);

    const events = [2, 3, 4].map((i) =>
      makeOutboxEvent<EventQueueEntity>(
        {
          id: `00000000-0000-0000-0000-00000000000${i.toString()}`,
          type: 'test.event',
          emitter: 'test-suite',
          status: OutboxStatus.PENDING,
          attempts: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
          version: 1,
          payload: { after: { index: i } },
        },
        () => new EventQueueEntity(),
      ),
    );

    await writer.createMany(events);

    await runner.runCycle();

    const processedItems = await repo.findBy({ status: OutboxStatus.COMPLETED });
    const processedIds = processedItems.map((i) => i.id);
    expect(processedIds).toContain(events[0].id);
    expect(processedIds).toContain(events[1].id);
    expect(processedIds).toContain(events[2].id);
    expect(pusher.pushedItems).toHaveLength(3);
  });

  it('should run and stop correctly', async () => {
    const repo = testDataSource.getRepository(EventQueueModel);
    const eventId = '00000000-0000-0000-0000-000000000300';
    const event = makeOutboxEvent<EventQueueEntity>(
      {
        id: eventId,
        type: 'test.event',
        emitter: 'test-suite',
        status: OutboxStatus.PENDING,
        attempts: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
        payload: { after: { foo: 'bar' } },
      },
      () => new EventQueueEntity(),
    );
    await repo.save(repo.create(event as unknown as EventQueueModel));

    runner.start();
    expect(runner.isRunning).toBe(true);

    // Give it some time to run at least one cycle
    let dbItem = await repo.findOneBy({ id: event.id });
    const maxAttempts = 20;
    let attempts = 0;
    while (attempts < maxAttempts && dbItem?.status !== OutboxStatus.COMPLETED) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      dbItem = await repo.findOneBy({ id: event.id });
      attempts++;
    }

    expect(dbItem?.status).toBe(OutboxStatus.COMPLETED);
    await runner.stop();
    expect(runner.isRunning).toBe(false);
  });

  it('should not start if already running', async () => {
    runner.start();
    const isRunningBefore = runner.isRunning;
    runner.start();
    expect(runner.isRunning).toBe(isRunningBefore);
    await runner.stop();
  });
});
