import { describe, it, expect, beforeAll } from '@jest/globals';
import { databaseMapper } from '@volontariapp/database';
import { EventState, EventType } from '@volontariapp/contracts';
import { registerEventMappings } from '../../models/mappers.js';
import { EventEntity } from '../../entities/event.entity.js';
import { EventModel } from '../../models/event.model.js';
import { TagEntity } from '../../entities/tag.entity.js';
import { TagModel } from '../../models/tag.model.js';
import { RequirementEntity } from '../../entities/requirement.entity.js';
import { RequirementModel } from '../../models/requirement.model.js';
import { EventLocation } from '../../value-objects/event-location.value-object.js';

describe('registerEventMappings (Unit)', () => {
  beforeAll(() => {
    registerEventMappings();
  });

  // ─── TagEntity ↔ TagModel ─────────────────────────────────────────────────

  describe('TagEntity ↔ TagModel', () => {
    it('should map TagEntity → TagModel for all shared fields', () => {
      // Arrange
      const entity = Object.assign(new TagEntity(), {
        id: 'tag-1',
        name: 'Nature',
        slug: 'nature',
        balise: '#nature',
      });

      // Act
      const model = databaseMapper.map(entity, TagEntity, TagModel);

      // Assert
      expect(model).toBeInstanceOf(TagModel);
      expect(model.id).toBe('tag-1');
      expect(model.name).toBe('Nature');
      expect(model.slug).toBe('nature');
      expect(model.balise).toBe('#nature');
    });

    it('should map TagModel → TagEntity for all shared fields', () => {
      // Arrange
      const model = Object.assign(new TagModel(), {
        id: 'tag-2',
        name: 'Sport',
        slug: 'sport',
        balise: '#sport',
      });

      // Act
      const entity = databaseMapper.map(model, TagModel, TagEntity);

      // Assert
      expect(entity).toBeInstanceOf(TagEntity);
      expect(entity.id).toBe('tag-2');
      expect(entity.name).toBe('Sport');
      expect(entity.slug).toBe('sport');
      expect(entity.balise).toBe('#sport');
    });
  });

  // ─── RequirementEntity ↔ RequirementModel ────────────────────────────────

  describe('RequirementEntity ↔ RequirementModel', () => {
    it('should map RequirementEntity → RequirementModel', () => {
      // Arrange
      const entity = Object.assign(new RequirementEntity(), {
        id: 'req-1',
        name: 'Volunteer',
        description: 'Needs 5 volunteers',
        quantity: 5,
        currentQuantity: 2,
        isSystem: false,
        createdBy: 'user-1',
      });

      // Act
      const model = databaseMapper.map(entity, RequirementEntity, RequirementModel);

      // Assert
      expect(model).toBeInstanceOf(RequirementModel);
      expect(model.id).toBe('req-1');
      expect(model.name).toBe('Volunteer');
      expect(model.quantity).toBe(5);
      expect(model.currentQuantity).toBe(2);
      expect(model.isSystem).toBe(false);
    });

    it('should map RequirementModel → RequirementEntity', () => {
      // Arrange
      const model = Object.assign(new RequirementModel(), {
        id: 'req-2',
        name: 'Driver',
        description: 'Needs a driver',
        quantity: 1,
        currentQuantity: 0,
        isSystem: true,
        createdBy: 'user-2',
      });

      // Act
      const entity = databaseMapper.map(model, RequirementModel, RequirementEntity);

      // Assert
      expect(entity).toBeInstanceOf(RequirementEntity);
      expect(entity.isSystem).toBe(true);
      expect(entity.createdBy).toBe('user-2');
    });
  });

  // ─── EventEntity → EventModel — location override (A→B) ──────────────────

  describe('EventEntity → EventModel — location override (A→B)', () => {
    it('should convert EventLocation to GeoJSON Point [lon, lat]', () => {
      // Arrange
      const entity = Object.assign(new EventEntity(), {
        id: 'evt-1',
        name: 'Test Event',
        description: 'Desc',
        startAt: new Date(),
        endAt: new Date(),
        location: new EventLocation(48.8566, 2.3522),
        type: EventType.EVENT_TYPE_SOCIAL,
        state: EventState.EVENT_STATE_DRAFT,
        awardedImpactScore: 0,
        maxParticipants: 50,
      });

      // Act
      const model = databaseMapper.map(entity, EventEntity, EventModel);

      // Assert — GeoJSON uses [longitude, latitude] ordering
      expect(model.location).toEqual({
        type: 'Point',
        coordinates: [2.3522, 48.8566],
      });
    });

    it('should return undefined location when EventEntity has no location', () => {
      // Arrange
      const entity = Object.assign(new EventEntity(), {
        id: 'evt-2',
        name: 'No Location',
        description: 'Desc',
        startAt: new Date(),
        endAt: new Date(),
        type: EventType.EVENT_TYPE_SOCIAL,
        state: EventState.EVENT_STATE_DRAFT,
        awardedImpactScore: 0,
        maxParticipants: 50,
      });

      // Act
      const model = databaseMapper.map(entity, EventEntity, EventModel);

      // Assert
      expect(model.location).toBeUndefined();
    });
  });

  // ─── EventModel → EventEntity — location override (B→A) ──────────────────

  describe('EventModel → EventEntity — location override (B→A)', () => {
    it('should parse POINT WKT string into EventLocation(lat, lon)', () => {
      // Arrange — PostGIS returns location as a WKT string: POINT(longitude latitude)
      const model = Object.assign(new EventModel(), {
        id: 'evt-3',
        name: 'WKT Event',
        description: 'Desc',
        startAt: new Date(),
        endAt: new Date(),
        location: 'POINT(2.3522 48.8566)' as unknown as EventModel['location'],
        type: EventType.EVENT_TYPE_SOCIAL,
        state: EventState.EVENT_STATE_DRAFT,
        awardedImpactScore: 0,
        maxParticipants: 50,
      });

      // Act
      const entity = databaseMapper.map(model, EventModel, EventEntity);

      // Assert
      expect(entity.location).toBeInstanceOf(EventLocation);
      expect(entity.location.latitude).toBeCloseTo(48.8566, 4);
      expect(entity.location.longitude).toBeCloseTo(2.3522, 4);
    });

    it('should parse GeoJSON coordinates array into EventLocation(lat, lon)', () => {
      // Arrange — GeoJSON coordinates are [longitude, latitude]
      const model = Object.assign(new EventModel(), {
        id: 'evt-4',
        name: 'GeoJSON Event',
        description: 'Desc',
        startAt: new Date(),
        endAt: new Date(),
        location: { type: 'Point' as const, coordinates: [2.3522, 48.8566] as [number, number] },
        type: EventType.EVENT_TYPE_SOCIAL,
        state: EventState.EVENT_STATE_DRAFT,
        awardedImpactScore: 0,
        maxParticipants: 50,
      });

      // Act
      const entity = databaseMapper.map(model, EventModel, EventEntity);

      // Assert
      expect(entity.location).toBeInstanceOf(EventLocation);
      expect(entity.location.latitude).toBeCloseTo(48.8566, 4);
      expect(entity.location.longitude).toBeCloseTo(2.3522, 4);
    });

    it('should fallback to EventLocation(0, 0) when location is null', () => {
      // Arrange
      const model = Object.assign(new EventModel(), {
        id: 'evt-5',
        name: 'Null Location',
        description: 'Desc',
        startAt: new Date(),
        endAt: new Date(),
        location: null as unknown as EventModel['location'],
        type: EventType.EVENT_TYPE_SOCIAL,
        state: EventState.EVENT_STATE_DRAFT,
        awardedImpactScore: 0,
        maxParticipants: 50,
      });

      // Act
      const entity = databaseMapper.map(model, EventModel, EventEntity);

      // Assert
      expect(entity.location).toBeInstanceOf(EventLocation);
      expect(entity.location.latitude).toBe(0);
      expect(entity.location.longitude).toBe(0);
    });
  });
});
