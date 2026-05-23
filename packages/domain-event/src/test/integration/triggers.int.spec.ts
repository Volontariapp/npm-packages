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
import { EventMessagingType } from '@volontariapp/messaging';
import {
  EVENT_QUEUE_TRIGGER_FUNCTION,
  EVENTS_TRIGGER,
  REQUIREMENTS_TRIGGER,
  TAGS_TRIGGER,
  EVENT_TAGS_TRIGGER,
} from '../../database/triggers/index.js';
import { Streams } from '@volontariapp/shared';

describe('SQL Triggers (Integration)', () => {
  let eventRepository: PostgresEventRepository;
  let tagRepository: PostgresTagRepository;
  let requirementRepository: PostgresRequirementRepository;

  beforeAll(async () => {
    await initializeTestDb();
    await testDataSource.runMigrations();

    await testDataSource.query(EVENT_QUEUE_TRIGGER_FUNCTION);
    await testDataSource.query(EVENTS_TRIGGER);
    await testDataSource.query(REQUIREMENTS_TRIGGER);
    await testDataSource.query(TAGS_TRIGGER);
    await testDataSource.query(EVENT_TAGS_TRIGGER);

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
      .getRepository(EventQueueModel<EventMessagingType>)
      .find({ where: { type: EventMessagingType.EVENT_CHANGED } });
    expect(records).toHaveLength(1);
    const record = records[0];
    expect(record.payload.after.name).toBe('Trigger Test Event');
    expect(record.payload.before).toBeFalsy();
    expect(record.emitter).toBe('ms-event-db');
    expect(record.targetServices).toContain(Streams.SOCIAL_INTERACTIONS);
  });

  it('should create an event_queue record when a requirement is updated', async () => {
    const req = await requirementRepository.create(
      RequirementFactory.buildInput({ currentQuantity: 0 }),
    );
    await requirementRepository.update(req.id, {
      currentQuantity: 5,
      updatedBy: '11111111-1111-1111-1111-111111111111',
    });
    console.log(
      'DB State Requirements:',
      await testDataSource.query('SELECT * FROM requirements WHERE id = $1', [req.id]),
    );
    const records = await testDataSource
      .getRepository(EventQueueModel<EventMessagingType>)
      .find({ where: { type: EventMessagingType.REQUIREMENT_CHANGED } });
    expect(records.length).toBeGreaterThanOrEqual(2);
    const updateRecord = records.find((r) => !!r.payload.before);
    expect(updateRecord).toBeDefined();
    if (updateRecord) {
      expect(updateRecord.payload.before?.currentQuantity).toBe(0);
      expect(updateRecord.payload.after.currentQuantity).toBe(5);
      expect(updateRecord.emitter).toBe('ms-event-db');
      expect(updateRecord.emitterId).toBe('11111111-1111-1111-1111-111111111111');
    }
  });

  it('should create an event_queue record when a tag is deleted', async () => {
    const tag = await tagRepository.create(
      TagFactory.buildInput({
        name: 'To Delete',
        updatedBy: '22222222-2222-2222-2222-222222222222',
      }),
    );
    await tagRepository.delete(tag.id);
    const records = await testDataSource
      .getRepository(EventQueueModel<EventMessagingType>)
      .find({ where: { type: EventMessagingType.TAG_CHANGED } });
    const deleteRecord = records.find((r) => r.payload.before?.name === 'To Delete');
    expect(deleteRecord).toBeDefined();
    if (deleteRecord) {
      expect(deleteRecord.payload.after).toBeFalsy();
      expect(deleteRecord.payload.before?.name).toBe('To Delete');
      expect(deleteRecord.emitterId).toBe('22222222-2222-2222-2222-222222222222');
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
      .getRepository(EventQueueModel<EventMessagingType>)
      .find({ where: { type: EventMessagingType.EVENT_TAG_LINKED } });
    expect(records).toHaveLength(1);
    const record = records[0];
    expect(record.payload.after.eventsId).toBe(event.id);
    expect(record.payload.after.tagsId).toBe(tag.id);
    expect(record.emitter).toBe('ms-event-db');
  });
});
