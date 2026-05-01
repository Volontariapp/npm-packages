import { describe, expect, it, beforeAll, afterAll, beforeEach } from '@jest/globals';
import {
  databaseMapper,
  EventQueueModel,
  EventQueueEntity,
  OutboxStatus,
} from '@volontariapp/database';
import { testDataSource, initializeTestDb, closeTestDb } from '../../data-source.js';
import { EventQueueDispatcher } from '../../../dispatchers/event-queue.dispatcher.js';
import { TestEventQueueRepository } from '../../utils/repositories/event-queue-test.repository.js';
import { makeLoggerMock } from '../../utils/helpers/logger-mock.helper.js';
import type { FakePayload } from '../../utils/helpers/event-queue-generics.helper.js';
import { EventType } from '../../utils/helpers/event-queue-generics.helper.js';

describe('EventQueue Generics (Integration)', () => {
  let dispatcher: EventQueueDispatcher<EventType, FakePayload>;
  let repository: TestEventQueueRepository<EventType, FakePayload>;
  const logger = makeLoggerMock();

  beforeAll(async () => {
    await initializeTestDb();
    databaseMapper.registerBidirectional(EventQueueModel, EventQueueEntity);
    repository = new TestEventQueueRepository<EventType, FakePayload>(
      testDataSource.getRepository(EventQueueModel),
    );
    dispatcher = new EventQueueDispatcher<EventType, FakePayload>(logger, repository);
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await testDataSource.getRepository(EventQueueModel).createQueryBuilder().delete().execute();
  });

  it('should persist and retrieve a perfectly typed generic event', async () => {
    const event = new EventQueueEntity<EventType.FAKE, FakePayload>();
    event.id = '00000000-0000-0000-0000-000000000001';
    event.type = EventType.FAKE;
    event.emitter = 'test';
    event.status = OutboxStatus.PENDING;
    event.version = 1;
    event.payload = {
      after: { foo: 'bar', count: 42 },
    };

    await repository.create(event);

    const retrieved = await repository.findOneOrFail({ id: event.id });

    expect(retrieved.type).toBe(EventType.FAKE);
    expect(retrieved.payload.after.foo).toBe('bar');
    expect(retrieved.payload.after.count).toBe(42);

    await dispatcher.markAsProcessing(retrieved);

    const updated = await repository.findOneOrFail({ id: event.id });
    expect(updated.status).toBe(OutboxStatus.PROCESSING);
  });
});
