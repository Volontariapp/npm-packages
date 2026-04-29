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

describe('EventQueueDispatcher (Integration)', () => {
  let dispatcher: EventQueueDispatcher;
  let repository: TestEventQueueRepository;
  const logger = makeLoggerMock();

  beforeAll(async () => {
    await initializeTestDb();
    databaseMapper.registerBidirectional(EventQueueModel, EventQueueEntity);
    repository = new TestEventQueueRepository(testDataSource.getRepository(EventQueueModel));
    dispatcher = new EventQueueDispatcher(logger, repository);
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await testDataSource.getRepository(EventQueueModel).createQueryBuilder().delete().execute();
  });

  it('markAsProcessing() should update status in database', async () => {
    const repo = testDataSource.getRepository(EventQueueModel);
    const event = repo.create({
      id: '00000000-0000-0000-0000-000000000001',
      type: 'test',
      emitter: 'test',
      status: OutboxStatus.PENDING,
      payload: {},
      version: 1,
      updatedAt: new Date(),
    } as Partial<EventQueueModel>);
    await repo.save(event);

    const entity = await repository.findOneOrFail({ id: event.id });
    await dispatcher.markAsProcessing(entity);

    const updated = await repo.findOneByOrFail({ id: event.id });
    expect(updated.status).toBe(OutboxStatus.PROCESSING);
  });

  it('markAsFailed() should update status and lastError in database', async () => {
    const repo = testDataSource.getRepository(EventQueueModel);
    const event = repo.create({
      id: '00000000-0000-0000-0000-000000000002',
      type: 'test',
      emitter: 'test',
      status: OutboxStatus.PROCESSING,
      payload: {},
      version: 1,
      updatedAt: new Date(),
    } as Partial<EventQueueModel>);
    await repo.save(event);

    const entity = await repository.findOneOrFail({ id: event.id });
    const error = 'Failure reason';
    await dispatcher.markAsFailed(entity, error);

    const updated = await repo.findOneByOrFail({ id: event.id });
    expect(updated.status).toBe(OutboxStatus.FAILED);
    expect(updated.lastError).toBe(error);
  });

  it('markAsCompleted() should update status to COMPLETED in database', async () => {
    const repo = testDataSource.getRepository(EventQueueModel);
    const event = repo.create({
      id: '00000000-0000-0000-0000-000000000003',
      type: 'test',
      emitter: 'test',
      status: OutboxStatus.PROCESSING,
      payload: {},
      version: 1,
      updatedAt: new Date(),
    } as Partial<EventQueueModel>);
    await repo.save(event);

    const entity = await repository.findOneOrFail({ id: event.id });
    await dispatcher.markAsCompleted(entity);

    const updated = await repo.findOneByOrFail({ id: event.id });
    expect(updated.status).toBe(OutboxStatus.COMPLETED);
  });
});
