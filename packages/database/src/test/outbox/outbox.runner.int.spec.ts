import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { testDataSource, setupIntegrationTest } from '../utils/index.js';
import { EventQueueModel } from '../../outbox/models/event-queue.model.js';
import { EventQueueEntity } from '../../outbox/entities/event-queue.entity.js';
import { OutboxRunner } from '../../outbox/runners/outbox.runner.js';
import { OutboxDispatcher } from '../../outbox/dispatchers/outbox.dispatcher.js';
import { OutboxWriter } from '../../outbox/writers/outbox.writer.js';
import { OutboxStatus } from '../../outbox/types/outbox.status.js';
import { EventQueueTestRepository } from '../utils/repositories/event-queue-test.repository.js';
import { makeLoggerMock, type TestLoggerMock } from '../utils/helpers/logger-mock.helper.js';
import { makeOutboxEvent } from '../utils/helpers/outbox-event.helper.js';

import { OutboxRunnerConfig, LoggerConfig, LoggerFormat } from '@volontariapp/config';

describe('Outbox Flow (Integration)', () => {
  let repository: EventQueueTestRepository;
  let loggerMock: TestLoggerMock;
  let writer: OutboxWriter<EventQueueModel, EventQueueEntity>;
  let runner: OutboxRunner<EventQueueModel, EventQueueEntity>;

  setupIntegrationTest([EventQueueModel]);

  beforeAll(() => {
    loggerMock = makeLoggerMock();
    repository = new EventQueueTestRepository(testDataSource.getRepository(EventQueueModel));
    writer = new OutboxWriter(loggerMock as never, repository);
    const config = new OutboxRunnerConfig();
    config.batchIntervalMs = 50;
    config.batchSize = 10;
    config.logger = new LoggerConfig();
    config.logger.format = LoggerFormat.JSON;
    config.logger.level = 'debug';

    const dispatcher = new OutboxDispatcher(loggerMock as never, repository);
    runner = new OutboxRunner(repository, config, dispatcher);
  });

  afterAll(async () => {
    await runner.stop();
  });

  it('should complete the whole flow for EventQueue: write -> run cycle -> mark as processing', async () => {
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
    expect(dbItem?.payload).toEqual({ after: { foo: 'bar' } });

    runner.start();

    const maxAttempts = 10;
    let attempts = 0;
    let processed = false;

    while (attempts < maxAttempts && !processed) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      dbItem = await repo.findOneBy({ id: event.id });
      if (dbItem?.status === OutboxStatus.PROCESSING) {
        processed = true;
      }
      attempts++;
    }

    expect(dbItem?.status).toBe(OutboxStatus.PROCESSING);

    await runner.stop();
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

    runner.start();

    const maxAttempts = 10;
    let attempts = 0;
    let allProcessed = false;

    while (attempts < maxAttempts && !allProcessed) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      const count = await repo.countBy({ status: OutboxStatus.PROCESSING });
      if (count >= 4) {
        // 1 from previous test + 3 from this one
        allProcessed = true;
      }
      attempts++;
    }

    const processedItems = await repo.findBy({ status: OutboxStatus.PROCESSING });
    const processedIds = processedItems.map((i) => i.id);
    expect(processedIds).toContain(events[0].id);
    expect(processedIds).toContain(events[1].id);
    expect(processedIds).toContain(events[2].id);

    await runner.stop();
  });
});
