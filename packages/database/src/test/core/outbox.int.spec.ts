import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import type { Repository } from 'typeorm';
import { BaseRepository } from '../../core/base.repository.js';
import { testDataSource, initializeTestDb, closeTestDb } from '../data-source.js';
import { OutboxEntity } from '../../outbox/entities/outbox.entity.js';
import { OutboxModel } from '../../outbox/models/outbox.model.js';
import { OutboxWriter } from '../../outbox/writer/outbox.writer.js';
import { OutboxStatus } from '../../outbox/types/outbox.status.js';

class TestOutboxRepository extends BaseRepository<OutboxModel, OutboxEntity, string> {
  constructor(repository: Repository<OutboxModel>) {
    super(repository, OutboxEntity, OutboxModel);
  }
}

const makeOutboxEvent = (overrides: Partial<OutboxModel> = {}): OutboxModel => {
  const event = new OutboxModel();
  event.type = 'user.created';
  event.emitter = 'database-tests';
  return Object.assign(event, overrides);
};

describe('Outbox Writer (Full Integration)', () => {
  let outboxWriter: OutboxWriter<OutboxModel>;
  let repository: TestOutboxRepository;

  beforeAll(async () => {
    await initializeTestDb();
    repository = new TestOutboxRepository(testDataSource.getRepository(OutboxModel));
    outboxWriter = new OutboxWriter(repository);
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await testDataSource.getRepository(OutboxModel).createQueryBuilder().delete().execute();
  });

  it('create() should persist event in database', async () => {
    const event = makeOutboxEvent();

    await outboxWriter.create(event);

    const rows = await testDataSource.getRepository(OutboxModel).find();
    expect(rows).toHaveLength(1);
    expect(rows[0].type).toBe('user.created');
    expect(rows[0].status).toBe(OutboxStatus.PENDING);
    expect(rows[0].attempts).toBe(0);
    expect(rows[0].id).toBeDefined();
  });

  it('createMany() should persist all events with provided structure', async () => {
    const events = [
      makeOutboxEvent({ type: 'user.created' }),
      makeOutboxEvent({
        type: 'user.updated',
        status: OutboxStatus.PROCESSING,
        attempts: 2,
      }),
    ];

    await outboxWriter.createMany(events);

    const rows = await testDataSource.getRepository(OutboxModel).find({ order: { type: 'ASC' } });
    expect(rows).toHaveLength(2);
    expect(rows[0].type).toBe('user.created');
    expect(rows[1].type).toBe('user.updated');
    expect(rows[1].status).toBe(OutboxStatus.PROCESSING);
    expect(rows[1].attempts).toBe(2);
  });
});
