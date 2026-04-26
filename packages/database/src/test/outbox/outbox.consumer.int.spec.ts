import { describe, it, expect, beforeAll } from '@jest/globals';
import { testDataSource, setupIntegrationTest } from '../utils/index.js';
import { OutboxModel } from '../../outbox/models/outbox.model.js';
import { OutboxConsumer } from '../../outbox/consumers/outbox.consumer.js';
import { OutboxStatus } from '../../outbox/types/outbox.status.js';
import { makeOutboxEvent } from '../utils/helpers/outbox-event.helper.js';
import { TestOutboxRepository } from '../utils/repositories/outbox-test.repository.js';
import { makeLoggerMock, type TestLoggerMock } from '../utils/helpers/logger-mock.helper.js';

describe('OutboxConsumer (Integration)', () => {
  let repository: TestOutboxRepository;
  let loggerMock: TestLoggerMock;

  setupIntegrationTest([OutboxModel]);

  beforeAll(() => {
    loggerMock = makeLoggerMock();
    repository = new TestOutboxRepository(testDataSource.getRepository(OutboxModel));
  });

  it('should fetch waiting items and mark them as processing', async () => {
    const repo = testDataSource.getRepository(OutboxModel);
    const event1 = makeOutboxEvent({
      id: '00000000-0000-0000-0000-000000000001',
      status: OutboxStatus.PENDING,
    });
    const event2 = makeOutboxEvent({
      id: '00000000-0000-0000-0000-000000000002',
      status: OutboxStatus.PENDING,
    });
    await repo.save([event1, event2]);

    const singleConsumer = new OutboxConsumer(loggerMock as never, repository, 1);
    const items = await singleConsumer.fetchPendingItems();
    expect(items).toHaveLength(1);
    expect(items[0].status).toBe(OutboxStatus.PROCESSING);

    const dbItem = await repo.findOneBy({ id: items[0].id });
    expect(dbItem?.status).toBe(OutboxStatus.PROCESSING);

    const remaining = await repo.countBy({ status: OutboxStatus.PENDING });
    expect(remaining).toBe(1);
  });

  it('should handle parallel consumers correctly using SKIP LOCKED', async () => {
    const repo = testDataSource.getRepository(OutboxModel);
    const events = Array.from({ length: 10 }).map((_, i) =>
      makeOutboxEvent({
        id: `00000000-0000-0000-0000-0000000000${(i + 1).toString().padStart(2, '0')}`,
        status: OutboxStatus.PENDING,
      }),
    );
    await repo.save(events);

    // Simulate parallel consumers
    const consumer1 = new OutboxConsumer(loggerMock as never, repository, 5);
    const consumer2 = new OutboxConsumer(loggerMock as never, repository, 5);
    const [results1, results2] = await Promise.all([
      consumer1.fetchPendingItems(),
      consumer2.fetchPendingItems(),
    ]);

    expect(results1).toHaveLength(5);
    expect(results2).toHaveLength(5);

    // Ensure no overlap in IDs
    const ids1 = new Set(results1.map((i) => i.id));
    const ids2 = new Set(results2.map((i) => i.id));

    const intersection = [...ids1].filter((id) => ids2.has(id));
    expect(intersection).toHaveLength(0);

    const totalProcessed = await repo.countBy({ status: OutboxStatus.PROCESSING });
    expect(totalProcessed).toBe(10);
  });

  it('should handle three parallel consumers: two fetching all items, third getting none', async () => {
    const repo = testDataSource.getRepository(OutboxModel);
    const events = Array.from({ length: 10 }).map((_, i) =>
      makeOutboxEvent({
        id: `00000000-0000-1111-0000-0000000000${(i + 1).toString().padStart(2, '0')}`,
        status: OutboxStatus.PENDING,
      }),
    );
    await repo.save(events);

    const consumer1 = new OutboxConsumer(loggerMock as never, repository, 5);
    const consumer2 = new OutboxConsumer(loggerMock as never, repository, 5);
    const consumer3 = new OutboxConsumer(loggerMock as never, repository, 5);

    const [results1, results2, results3] = await Promise.all([
      consumer1.fetchPendingItems(),
      consumer2.fetchPendingItems(),
      consumer3.fetchPendingItems(),
    ]);

    const allResults = [results1, results2, results3];
    const fiveItemsResults = allResults.filter((r) => r.length === 5);
    const zeroItemsResults = allResults.filter((r) => r.length === 0);

    expect(fiveItemsResults).toHaveLength(2);
    expect(zeroItemsResults).toHaveLength(1);

    const totalProcessed = await repo.countBy({ status: OutboxStatus.PROCESSING });
    expect(totalProcessed).toBe(10);
  });
});
