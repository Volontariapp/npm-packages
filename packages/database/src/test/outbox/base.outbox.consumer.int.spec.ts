import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { PostgresProvider } from '@volontariapp/bridge';
import { BaseRepository } from '../../core/base.repository.js';
import { OutboxModel } from '../../outbox/models/outbox.model.js';
import { OutboxEntity } from '../../outbox/entities/outbox.entity.js';
import { BaseOutboxConsumer } from '../../outbox/consumers/base.outbox.consumer.js';
import { OutboxStatus } from '../../outbox/types/outbox.status.js';
import { makeOutboxEvent } from '../utils/helpers/outbox-event.helper.js';
import { TestOutboxRepository } from '../utils/repositories/outbox-test.repository.js';

describe('BaseOutboxConsumer (Integration)', () => {
  let provider: PostgresProvider;
  let repository: TestOutboxRepository;
  let consumer: BaseOutboxConsumer<OutboxModel, OutboxEntity>;

  beforeAll(async () => {
    provider = new PostgresProvider({
      host: 'localhost',
      port: 5433,
      username: 'testuser',
      password: 'testpassword',
      database: 'volontariapp_test',
      synchronize: true,
      dropSchema: true,
      entities: [OutboxModel],
    } as any);
    await provider.connect();
    repository = new TestOutboxRepository(provider.getDriver().getRepository(OutboxModel));
    consumer = new BaseOutboxConsumer(repository);
  });

  afterAll(async () => {
    await provider.disconnect();
  });

  beforeEach(async () => {
    const repo = provider.getDriver().getRepository(OutboxModel);
    await repo.clear();
  });

  it('should fetch waiting items and mark them as processing', async () => {
    const repo = provider.getDriver().getRepository(OutboxModel);
    const event1 = makeOutboxEvent({ id: '00000000-0000-0000-0000-000000000001', status: OutboxStatus.PENDING });
    const event2 = makeOutboxEvent({ id: '00000000-0000-0000-0000-000000000002', status: OutboxStatus.PENDING });
    await repo.save([event1, event2]);

    const items = await consumer.fetchWaitingItems(1);
    expect(items).toHaveLength(1);
    expect(items[0].status).toBe(OutboxStatus.PROCESSING);

    const dbItem = await repo.findOneBy({ id: items[0].id });
    expect(dbItem?.status).toBe(OutboxStatus.PROCESSING);

    const remaining = await repo.countBy({ status: OutboxStatus.PENDING });
    expect(remaining).toBe(1);
  });

  it('should handle parallel consumers correctly using SKIP LOCKED', async () => {
    const repo = provider.getDriver().getRepository(OutboxModel);
    const events = Array.from({ length: 10 }).map((_, i) =>
      makeOutboxEvent({
        id: `00000000-0000-0000-0000-0000000000${(i + 1).toString().padStart(2, '0')}`,
        status: OutboxStatus.PENDING,
      }),
    );
    await repo.save(events);

    // Simulate parallel consumers
    const [results1, results2] = await Promise.all([
      consumer.fetchWaitingItems(5),
      consumer.fetchWaitingItems(5),
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
});
