import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { testDataSource, initializeTestDb, closeTestDb } from '../data-source.js';
import { OutboxModel } from '../../outbox/models/outbox.model.js';
import { OutboxWriter } from '../../outbox/writer/outbox.writer.js';
import { OutboxStatus } from '../../outbox/types/outbox.status.js';
import { OutboxEntity } from '../../outbox/entities/outbox.entity.js';
import { databaseMapper } from '../../core/mapper.service.js';
import { makeOutboxEvent } from '../utils/outbox-event.helper.js';
import { makeExtendedOutboxEvent } from '../utils/extended-outbox-event.helper.js';
import { TestOutboxWriterRepository } from '../utils/outbox-test.repository.js';
import { TestExtendedOutboxWriter } from '../utils/outbox-extended-test.repository.js';
import { ExtendedOutboxEntity } from '../example/entities/extended-outbox.entity.js';
import { ExtendedOutboxModel } from '../example/models/extended-outbox.model.js';



describe('Outbox Writer (Full Integration)', () => {
  let outboxWriter: OutboxWriter<OutboxModel, OutboxEntity>;
  let repository: TestOutboxWriterRepository;
  const logger = {
    info: () => undefined,
    warn: () => undefined,
    error: () => undefined,
  };

  beforeAll(async () => {
    await initializeTestDb();
    repository = new TestOutboxWriterRepository(testDataSource.getRepository(OutboxModel));
    outboxWriter = new OutboxWriter(logger as never, repository);
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

  it('update() should persist outbox event updates in database', async () => {
    const event = makeOutboxEvent({ attempts: 0, status: OutboxStatus.PENDING });
    await outboxWriter.create(event);

    const row = await testDataSource.getRepository(OutboxModel).findOneByOrFail({ type: event.type });
    const toUpdate = Object.assign(new OutboxEntity(), row, {
      status: OutboxStatus.PROCESSING,
      attempts: 1,
    });

    await outboxWriter.update(toUpdate);

    const updated = await testDataSource.getRepository(OutboxModel).findOneByOrFail({ id: row.id });
    expect(updated.status).toBe(OutboxStatus.PROCESSING);
    expect(updated.attempts).toBe(1);
  });

  it('delete() should remove outbox event from database', async () => {
    const event = makeOutboxEvent({ type: 'user.deleted' });
    await outboxWriter.create(event);

    const row = await testDataSource.getRepository(OutboxModel).findOneByOrFail({ type: event.type });
    await outboxWriter.delete(row.id);

    const deleted = await testDataSource.getRepository(OutboxModel).findOneBy({ id: row.id });
    expect(deleted).toBeNull();
  });
});

describe('Outbox Writer with extended model/entity (Full Integration)', () => {
  let outboxWriter: TestExtendedOutboxWriter;
  const logger = {
    info: () => undefined,
    warn: () => undefined,
    error: () => undefined,
  };

  beforeAll(async () => {
    await initializeTestDb();
    databaseMapper.registerBidirectional(ExtendedOutboxModel, ExtendedOutboxEntity);
    outboxWriter = new TestExtendedOutboxWriter(
      logger as never,
      testDataSource.getRepository(ExtendedOutboxModel),
    );
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await testDataSource.getRepository(ExtendedOutboxModel).createQueryBuilder().delete().execute();
  });

  it('create() should persist an extended outbox entity', async () => {
    const event = makeExtendedOutboxEvent({
      type: 'extended.created',
      channel: 'sms',
    });

    await outboxWriter.create(event);

    const row = await testDataSource
      .getRepository(ExtendedOutboxModel)
      .findOneByOrFail({ type: 'extended.created' });
    expect(row.channel).toBe('sms');
  });

  it('createMany() should persist extended outbox entities', async () => {
    const events = [
      makeExtendedOutboxEvent({
        type: 'extended.created',
        createdAt: new Date(Date.now() - 60_000),
        channel: 'sms',
      }),
      makeExtendedOutboxEvent({
        type: 'extended.updated',
        createdAt: new Date(Date.now() - 30_000),
        channel: 'email',
      }),
    ];

    await outboxWriter.createMany(events);

    const rows = await testDataSource.getRepository(ExtendedOutboxModel).find({ order: { type: 'ASC' } });
    expect(rows).toHaveLength(2);
    expect(rows[0].channel).toBe('sms');
    expect(rows[1].channel).toBe('email');
  });

  it('update() should persist channel and status updates on extended entities', async () => {
    const event = makeExtendedOutboxEvent({
      type: 'extended.to-update',
      channel: 'push',
    });

    await outboxWriter.create(event);

    const created = await testDataSource
      .getRepository(ExtendedOutboxModel)
      .findOneByOrFail({ type: 'extended.to-update' });
    const toUpdate = makeExtendedOutboxEvent({
      ...created,
      status: OutboxStatus.PROCESSING,
      attempts: 2,
      channel: 'sms',
    });

    await outboxWriter.update(toUpdate);

    const updated = await testDataSource.getRepository(ExtendedOutboxModel).findOneByOrFail({ id: created.id });
    expect(updated.status).toBe(OutboxStatus.PROCESSING);
    expect(updated.attempts).toBe(2);
    expect(updated.channel).toBe('sms');
  });

  it('delete() should remove an extended outbox entity', async () => {
    const event = makeExtendedOutboxEvent({
      type: 'extended.to-delete',
      channel: 'sms',
    });
    await outboxWriter.create(event);

    const created = await testDataSource
      .getRepository(ExtendedOutboxModel)
      .findOneByOrFail({ type: 'extended.to-delete' });

    await outboxWriter.delete(created.id);

    const deleted = await testDataSource.getRepository(ExtendedOutboxModel).findOneBy({ id: created.id });
    expect(deleted).toBeNull();
  });
});
