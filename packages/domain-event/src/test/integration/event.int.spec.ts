import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { EventState, EventType } from '@volontariapp/contracts';
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
import { EventEntity } from '../../entities/event.entity.js';
import { EventLocation } from '../../value-objects/event-location.value-object.js';
import { EventFactory } from '../__test-utils__/factories/event.factory.js';
import { TagFactory } from '../__test-utils__/factories/tag.factory.js';
import { RequirementFactory } from '../__test-utils__/factories/requirement.factory.js';

describe('PostgresEventRepository (Integration)', () => {
  let eventRepository: PostgresEventRepository;
  let tagRepository: PostgresTagRepository;
  let requirementRepository: PostgresRequirementRepository;

  beforeAll(async () => {
    await initializeTestDb();
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

  // ─── create ───────────────────────────────────────────────────────────────

  describe('create()', () => {
    it('should persist an event and return a mapped EventEntity', async () => {
      // Arrange
      const input = EventFactory.buildInput();

      // Act
      const result = await eventRepository.create(input);

      // Assert
      expect(result).toBeInstanceOf(EventEntity);
      expect(result.id).toBeDefined();
      expect(result.name).toBe(input.name);
      expect(result.description).toBe(input.description);
      expect(result.type).toBe(EventType.EVENT_TYPE_SOCIAL);
      expect(result.state).toBe(EventState.EVENT_STATE_DRAFT);
      expect(result.awardedImpactScore).toBe(10);
      expect(result.maxParticipants).toBe(100);
    });

    it('should generate a UUID for the id automatically', async () => {
      // Arrange
      const input = EventFactory.buildInput();

      // Act
      const result = await eventRepository.create(input);

      // Assert
      expect(result.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    });

    it('should persist and retrieve location as EventLocation from PostGIS', async () => {
      // Arrange
      const paris = new EventLocation(48.8566, 2.3522);
      const input = EventFactory.buildInput({ location: paris });

      // Act
      const created = await eventRepository.create(input);
      const retrieved = await eventRepository.findById(created.id);

      // Assert — location round-trips through PostGIS geography column
      expect(retrieved?.location).toBeInstanceOf(EventLocation);
      expect(retrieved?.location.latitude).toBeCloseTo(48.8566, 2);
      expect(retrieved?.location.longitude).toBeCloseTo(2.3522, 2);
    });

    it('should persist events with different EventType values', async () => {
      // Arrange
      const input = EventFactory.buildInput({ type: EventType.EVENT_TYPE_ECOLOGY });

      // Act
      const result = await eventRepository.create(input);

      // Assert
      expect(result.type).toBe(EventType.EVENT_TYPE_ECOLOGY);
    });

    it('should set createdAt and updatedAt automatically', async () => {
      // Arrange
      const input = EventFactory.buildInput();

      // Act
      const result = await eventRepository.create(input);

      // Assert
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });
  });

  // ─── findById ─────────────────────────────────────────────────────────────

  describe('findById()', () => {
    it('should return the event when it exists (without relations by default)', async () => {
      // Arrange
      const created = await eventRepository.create(EventFactory.buildInput());

      // Act
      const result = await eventRepository.findById(created.id);

      // Assert
      expect(result).not.toBeNull();
      expect(result?.id).toBe(created.id);
    });

    it('should return null when the event does not exist', async () => {
      // Act
      const result = await eventRepository.findById('00000000-0000-0000-0000-000000000000');

      // Assert
      expect(result).toBeNull();
    });

    it('should load tags relation when requested', async () => {
      // Arrange
      const tag = await tagRepository.create(TagFactory.buildInput());
      const input = EventFactory.buildInput();
      const event = await eventRepository.create(input);
      // Attach tag via join table using raw query
      await testDataSource.query(`INSERT INTO event_tags ("eventsId", "tagsId") VALUES ($1, $2)`, [
        event.id,
        tag.id,
      ]);

      // Act
      const result = await eventRepository.findById(event.id, ['tags']);

      // Assert
      expect(result?.tags).toHaveLength(1);
      expect(result?.tags?.[0].id).toBe(tag.id);
    });

    it('should load requirements relation when requested', async () => {
      // Arrange
      const req = await requirementRepository.create(RequirementFactory.buildInput());
      const event = await eventRepository.create(EventFactory.buildInput());
      await testDataSource.query(
        `INSERT INTO event_requirements ("eventsId", "requirementsId") VALUES ($1, $2)`,
        [event.id, req.id],
      );

      // Act
      const result = await eventRepository.findById(event.id, ['requirements']);

      // Assert
      expect(result?.requirements).toHaveLength(1);
      expect(result?.requirements?.[0].id).toBe(req.id);
    });
  });

  // ─── findAll ──────────────────────────────────────────────────────────────

  describe('findAll()', () => {
    it('should return all persisted events', async () => {
      // Arrange
      await eventRepository.create(EventFactory.buildInput());
      await eventRepository.create(EventFactory.buildInput());
      await eventRepository.create(EventFactory.buildInput());

      // Act
      const result = await eventRepository.findAll();

      // Assert
      expect(result).toHaveLength(3);
      expect(result[0]).toBeInstanceOf(EventEntity);
    });

    it('should return an empty array when no events are persisted', async () => {
      // Act
      const result = await eventRepository.findAll();

      // Assert
      expect(result).toHaveLength(0);
    });

    it('should load relations when findAll is called with relation names', async () => {
      // Arrange
      const tag = await tagRepository.create(TagFactory.buildInput());
      const event = await eventRepository.create(EventFactory.buildInput());
      await testDataSource.query(`INSERT INTO event_tags ("eventsId", "tagsId") VALUES ($1, $2)`, [
        event.id,
        tag.id,
      ]);

      // Act
      const result = await eventRepository.findAll(['tags']);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].tags).toHaveLength(1);
    });
  });

  // ─── update ───────────────────────────────────────────────────────────────

  describe('update()', () => {
    it('should update the event fields and return the updated entity', async () => {
      // Arrange
      const original = await eventRepository.create(
        EventFactory.buildInput({ name: 'Original Event', awardedImpactScore: 5 }),
      );

      // Act
      const updated = await eventRepository.update(original.id, {
        name: 'Updated Event',
        awardedImpactScore: 50,
      });

      // Assert
      expect(updated).not.toBeNull();
      expect(updated?.name).toBe('Updated Event');
      expect(updated?.awardedImpactScore).toBe(50);
      expect(updated?.id).toBe(original.id);
    });

    it('should update the event state', async () => {
      // Arrange
      const original = await eventRepository.create(
        EventFactory.buildInput({ state: EventState.EVENT_STATE_DRAFT }),
      );

      // Act
      const updated = await eventRepository.update(original.id, {
        state: EventState.EVENT_STATE_PUBLISHED,
      });

      // Assert
      expect(updated?.state).toBe(EventState.EVENT_STATE_PUBLISHED);
    });

    it('should return null when updating a non-existent event', async () => {
      // Act
      const result = await eventRepository.update('00000000-0000-0000-0000-000000000000', {
        name: 'Ghost',
      });

      // Assert
      expect(result).toBeNull();
    });
  });

  // ─── delete ───────────────────────────────────────────────────────────────

  describe('delete()', () => {
    it('should delete the event and return true', async () => {
      // Arrange
      const event = await eventRepository.create(EventFactory.buildInput());

      // Act
      const result = await eventRepository.delete(event.id);

      // Assert
      expect(result).toBe(true);
      const found = await eventRepository.findById(event.id);
      expect(found).toBeNull();
    });

    it('should return false when deleting a non-existent id', async () => {
      // Act
      const result = await eventRepository.delete('00000000-0000-0000-0000-000000000000');

      // Assert
      expect(result).toBe(false);
    });
  });

  // ─── search ───────────────────────────────────────────────────────────────

  describe('search()', () => {
    it('should return events whose name contains the search term', async () => {
      // Arrange
      await eventRepository.create(EventFactory.buildInput({ name: 'Beach Cleanup 2025' }));
      await eventRepository.create(EventFactory.buildInput({ name: 'Forest Walk' }));

      // Act
      const result = await eventRepository.search('Beach');

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Beach Cleanup 2025');
    });

    it('should return an empty array when no events match the search term', async () => {
      // Arrange
      await eventRepository.create(EventFactory.buildInput({ name: 'City Marathon' }));

      // Act
      const result = await eventRepository.search('nonexistent');

      // Assert
      expect(result).toHaveLength(0);
    });

    it('should be case-insensitive for the search term', async () => {
      // Arrange
      await eventRepository.create(EventFactory.buildInput({ name: 'Volunteer Day' }));

      // Act
      const result = await eventRepository.search('volunteer');

      // Assert
      expect(result).toHaveLength(1);
    });

    it('should return multiple events matching the partial search term', async () => {
      // Arrange
      await eventRepository.create(EventFactory.buildInput({ name: 'Park Cleanup North' }));
      await eventRepository.create(EventFactory.buildInput({ name: 'Park Cleanup South' }));
      await eventRepository.create(EventFactory.buildInput({ name: 'City Run' }));

      // Act
      const result = await eventRepository.search('Park Cleanup');

      // Assert
      expect(result).toHaveLength(2);
    });
  });

  // ─── location round-trip ──────────────────────────────────────────────────

  describe('location round-trip (PostGIS)', () => {
    it('should preserve latitude and longitude through PostGIS geography column', async () => {
      // Arrange — Eiffel Tower coordinates
      const eiffelTower = new EventLocation(48.8584, 2.2945);
      const input = EventFactory.buildInput({ location: eiffelTower });

      // Act
      const created = await eventRepository.create(input);
      const fetched = await eventRepository.findById(created.id);

      // Assert
      expect(fetched?.location).toBeInstanceOf(EventLocation);
      expect(fetched?.location.latitude).toBeCloseTo(eiffelTower.latitude, 3);
      expect(fetched?.location.longitude).toBeCloseTo(eiffelTower.longitude, 3);
    });

    it('should handle negative coordinates (Southern/Western hemisphere)', async () => {
      // Arrange — São Paulo coordinates
      const saoPaulo = new EventLocation(-23.5505, -46.6333);
      const input = EventFactory.buildInput({ location: saoPaulo });

      // Act
      const created = await eventRepository.create(input);
      const fetched = await eventRepository.findById(created.id);

      // Assert
      expect(fetched?.location.latitude).toBeCloseTo(-23.5505, 2);
      expect(fetched?.location.longitude).toBeCloseTo(-46.6333, 2);
    });
  });
});
