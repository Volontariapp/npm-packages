import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import {
  testDataSource,
  initializeTestDb,
  closeTestDb,
  truncateAll,
  getTestRepository,
} from '../data-source.js';
import { EventModel } from '../../models/event.model.js';
import { TagModel } from '../../models/tag.model.js';
import { RequirementModel } from '../../models/requirement.model.js';
import { PostgresEventRepository } from '../../repositories/postgres-event.repository.js';
import { PostgresTagRepository } from '../../repositories/postgres-tag.repository.js';
import { PostgresRequirementRepository } from '../../repositories/postgres-requirement.repository.js';
import { EventFactory } from '../__test-utils__/factories/event.factory.js';
import { TagFactory } from '../__test-utils__/factories/tag.factory.js';
import { RequirementFactory } from '../__test-utils__/factories/requirement.factory.js';
import { EventQueueModel } from '@volontariapp/database';
import { EventMessagingType, type EventRegistry } from '@volontariapp/messaging';

type TypedEventQueueModel<K extends keyof EventRegistry> = Omit<EventQueueModel, 'payload'> & {
  payload: EventRegistry[K];
};

describe('SQL Triggers (Integration)', () => {
  let eventRepository: PostgresEventRepository;
  let tagRepository: PostgresTagRepository;
  let requirementRepository: PostgresRequirementRepository;

  beforeAll(async () => {
    await initializeTestDb();
    await testDataSource.runMigrations();
    eventRepository = new PostgresEventRepository(getTestRepository(EventModel));
    tagRepository = new PostgresTagRepository(getTestRepository(TagModel));
    requirementRepository = new PostgresRequirementRepository(getTestRepository(RequirementModel));
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await truncateAll();
  });

  it('should create an event_queue record when an event is inserted', async () => {
    const input = EventFactory.buildInput({ name: 'Trigger Test Event' });
    await eventRepository.create(input);
    const records = await testDataSource
      .getRepository(EventQueueModel)
      .find({ where: { type: EventMessagingType.EVENT_CHANGED } });
    expect(records).toHaveLength(1);
    const record = records[0] as unknown as TypedEventQueueModel<
      typeof EventMessagingType.EVENT_CHANGED
    >;
    expect(record.payload.after?.name).toBe('Trigger Test Event');
    expect(record.payload.before).toBeFalsy();
    expect(record.emitter).toBe('ms-event-db');
  });

  it('should create an event_queue record when a requirement is updated', async () => {
    const req = await requirementRepository.create(
      RequirementFactory.buildInput({ currentQuantity: 0 }),
    );
    await requirementRepository.update(req.id, { currentQuantity: 5 });
    const records = await testDataSource.getRepository(EventQueueModel).find({
      where: { type: EventMessagingType.REQUIREMENT_CHANGED },
      order: { createdAt: 'DESC' },
    });
    expect(records.length).toBeGreaterThanOrEqual(2);
    const updateRecord = records[0] as unknown as TypedEventQueueModel<
      typeof EventMessagingType.REQUIREMENT_CHANGED
    >;
    expect(updateRecord.payload.before?.currentQuantity).toBe(0);
    expect(updateRecord.payload.after?.currentQuantity).toBe(5);
    expect(updateRecord.emitter).toBe('ms-event-db');
  });

  it('should create an event_queue record when a tag is deleted', async () => {
    const tag = await tagRepository.create(TagFactory.buildInput({ name: 'To Delete' }));
    await tagRepository.delete(tag.id);
    const records = await testDataSource
      .getRepository(EventQueueModel)
      .find({ where: { type: EventMessagingType.TAG_CHANGED } });
    const typedRecords = records as unknown as TypedEventQueueModel<
      typeof EventMessagingType.TAG_CHANGED
    >[];
    const deleteRecord = typedRecords.find((r) => r.payload.before?.name === 'To Delete');
    expect(deleteRecord).toBeDefined();
    if (deleteRecord) {
      expect(deleteRecord.payload.after).toBeFalsy();
      expect(deleteRecord.payload.before?.name).toBe('To Delete');
    }
  });

  it('should handle ManyToMany relation updates', async () => {
    const event = await eventRepository.create(EventFactory.buildInput({ name: 'Relation Event' }));
    const tag = await tagRepository.create(TagFactory.buildInput());
    await testDataSource.query('INSERT INTO event_tags ("eventsId", "tagsId") VALUES ($1, $2)', [
      event.id,
      tag.id,
    ]);
    const records = await testDataSource
      .getRepository(EventQueueModel)
      .find({ where: { type: EventMessagingType.EVENT_TAG_LINKED } });
    expect(records).toHaveLength(1);
    const record = records[0] as unknown as TypedEventQueueModel<
      typeof EventMessagingType.EVENT_TAG_LINKED
    >;
    expect(record.payload.after?.eventsId).toBe(event.id);
    expect(record.payload.after?.tagsId).toBe(tag.id);
    expect(record.emitter).toBe('ms-event-db');
  });
});
