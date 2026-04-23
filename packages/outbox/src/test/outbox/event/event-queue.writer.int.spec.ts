import { describe, expect, it, beforeAll, afterAll, beforeEach } from '@jest/globals';
import {
  databaseMapper,
  EventQueueModel,
  EventQueueEntity,
  OutboxStatus,
  type Repository,
} from '@volontariapp/database';
import { testDataSource, initializeTestDb, closeTestDb } from '../../data-source.js';
import { EventQueueWriter } from '../../../outbox/writer/event-queue.writer.js';
import { makeEventQueueEvent } from '../../utils/helpers/event-queue-event.helper.js';
import { TestEventQueueWriterRepository } from '../../utils/repositories/event-queue-test.repository.js';

describe('EventQueueWriter (Full Integration)', () => {
  let writer: EventQueueWriter;

  const logger = {
    info: () => undefined,
    warn: () => undefined,
    error: () => undefined,
  };

  beforeAll(async () => {
    await initializeTestDb();
    databaseMapper.registerBidirectional(EventQueueModel, EventQueueEntity);
    writer = new EventQueueWriter(
      logger as never,
      new TestEventQueueWriterRepository(
        testDataSource.getRepository(EventQueueModel) as unknown as Repository<EventQueueModel>,
      ),
    );
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await testDataSource.getRepository(EventQueueModel).createQueryBuilder().delete().execute();
  });

  it('create() should persist default values when not overridden', async () => {
    const event = makeEventQueueEvent();

    await writer.create(event);

    const row = await testDataSource
      .getRepository(EventQueueModel)
      .findOneByOrFail({ type: 'event.entity.updated' });

    expect(row.status).toBe(OutboxStatus.PENDING);
    expect(row.attempts).toBe(0);
    expect(row.version).toBe(1);
    expect(row.payload).toEqual({ after: { id: 'entity-1', state: 'created' } });
  });

  it('create() should persist overridden values', async () => {
    const event = makeEventQueueEvent({
      type: 'event.entity.published',
      status: OutboxStatus.FAILED,
      attempts: 2,
      version: 8,
      payload: {
        before: { id: 'entity-1', state: 'draft' },
        after: { id: 'entity-1', state: 'published' },
      },
    });

    await writer.create(event);

    const row = await testDataSource
      .getRepository(EventQueueModel)
      .findOneByOrFail({ type: 'event.entity.published' });

    expect(row.status).toBe(OutboxStatus.FAILED);
    expect(row.attempts).toBe(2);
    expect(row.version).toBe(8);
    expect(row.payload).toEqual({
      before: { id: 'entity-1', state: 'draft' },
      after: { id: 'entity-1', state: 'published' },
    });
  });
});
