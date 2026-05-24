import { describe, it, expect, beforeEach, afterAll, beforeAll } from '@jest/globals';
import {
  databaseMapper,
  EventQueueModel,
  EventQueueEntity,
  OutboxStatus,
} from '@volontariapp/database';
import { testDataSource, initializeTestDb, closeTestDb } from '../data-source.js';
import { EventQueueRepository } from '../../repositories/event-queue.repository.js';
import { randomUUID } from 'node:crypto';
import { Streams } from '@volontariapp/shared';

describe('EventQueueRepository Integration', () => {
  let repository: EventQueueRepository;

  beforeAll(async () => {
    await initializeTestDb();
    databaseMapper.registerBidirectional(EventQueueModel, EventQueueEntity);
    repository = new EventQueueRepository(testDataSource);
  });

  afterAll(async () => {
    await closeTestDb().catch(() => undefined);
  });

  beforeEach(async () => {
    const rawRepo = testDataSource.getRepository(EventQueueModel);
    await rawRepo.createQueryBuilder().delete().execute();
  });

  it('should check if an event exists', async () => {
    const eventId = randomUUID();

    let exists = await repository.exists({ id: eventId });
    expect(exists).toBe(false);

    const rawRepo = testDataSource.getRepository(EventQueueModel);
    const event = rawRepo.create({
      id: eventId,
      type: 'test-event',
      emitter: 'test-emitter',
      emitterId: '00000000-0000-0000-0000-000000000000',
      target: 'test-target',
      status: OutboxStatus.PENDING,
      attempts: 0,
      payload: { after: { action: 'test', data: {} } },
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      targetServices: [Streams.EVENT_EVENTS],
    } as EventQueueModel);
    await rawRepo.save(event);

    exists = await repository.exists({ id: eventId });
    expect(exists).toBe(true);
  });

  it('should find an event by id', async () => {
    const eventId = randomUUID();

    let entity = await repository.findById(eventId);
    expect(entity).toBeNull();

    const rawRepo = testDataSource.getRepository(EventQueueModel);
    const event = rawRepo.create({
      id: eventId,
      type: 'test-event',
      emitter: 'test-emitter',
      emitterId: '00000000-0000-0000-0000-000000000000',
      target: 'test-target',
      status: OutboxStatus.PENDING,
      attempts: 0,
      payload: { after: { action: 'test', data: {} } },
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      targetServices: [Streams.EVENT_EVENTS],
    } as EventQueueModel);
    await rawRepo.save(event);

    entity = await repository.findById(eventId);
    expect(entity).toBeDefined();
    expect(entity?.id).toBe(eventId);
    expect(entity?.status).toBe(OutboxStatus.PENDING);
  });
});
