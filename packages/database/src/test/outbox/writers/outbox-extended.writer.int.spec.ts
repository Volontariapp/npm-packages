import { describe, it, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';
import { testDataSource, initializeTestDb, closeTestDb } from '../../data-source.js';
import { databaseMapper } from '../../../core/mapper.service.js';
import { OutboxStatus } from '../../../outbox/types/outbox.status.js';
import { makeExtendedOutboxEvent } from '../../utils/helpers/extended-outbox-event.helper.js';
import { TestExtendedOutboxWriter } from '../../utils/repositories/outbox-extended-test.repository.js';
import { ExtendedOutboxEntity } from '../../example/entities/extended-outbox.entity.js';
import { ExtendedOutboxModel } from '../../example/models/extended-outbox.model.js';
import { Logger } from '@volontariapp/logger';

describe('Outbox Writer with extended model/entity (Full Integration)', () => {
  let outboxWriter: TestExtendedOutboxWriter;
  const logger = new Logger({ minLevel: 'fatal' });

  beforeAll(async () => {
    await initializeTestDb();
    databaseMapper.registerBidirectional(ExtendedOutboxModel, ExtendedOutboxEntity);
    outboxWriter = new TestExtendedOutboxWriter(
      logger,
      testDataSource.getRepository(ExtendedOutboxModel),
    );
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await testDataSource.getRepository(ExtendedOutboxModel).createQueryBuilder().delete().execute();
    jest.spyOn(logger, 'info').mockImplementation(() => {});
    jest.spyOn(logger, 'warn').mockImplementation(() => {});
    jest.spyOn(logger, 'error').mockImplementation(() => {});
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

    const rows = await testDataSource
      .getRepository(ExtendedOutboxModel)
      .find({ order: { type: 'ASC' } });
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

    // Explicitly update the created entity to avoid spread operator on class instance
    created.status = OutboxStatus.PROCESSING;
    created.attempts = 2;
    created.channel = 'sms';

    const toUpdate = makeExtendedOutboxEvent(created);

    await outboxWriter.update(toUpdate);

    const updated = await testDataSource
      .getRepository(ExtendedOutboxModel)
      .findOneByOrFail({ id: created.id });
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

    const deleted = await testDataSource
      .getRepository(ExtendedOutboxModel)
      .findOneBy({ id: created.id });
    expect(deleted).toBeNull();
  });
});
