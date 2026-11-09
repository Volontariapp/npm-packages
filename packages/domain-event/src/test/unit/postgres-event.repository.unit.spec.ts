import type { jest } from '@jest/globals';
import { describe, it, expect, beforeEach } from '@jest/globals';
import { PostgresEventRepository } from '../../repositories/postgres-event.repository.js';
import { EventModel } from '../../models/event.model.js';
import { TagModel } from '../../models/tag.model.js';
import { RequirementModel } from '../../models/requirement.model.js';
import { registerEventMappings } from '../../models/mappers.js';
import type { SelectQueryBuilder } from 'typeorm';
import { EventType, EventState } from '@volontariapp/contracts';
import { createMock } from '@volontariapp/testing';
import { In } from '@volontariapp/database';
import { MAX_EVENT_IDS_PER_LOOKUP } from '../../constants.js';

describe('PostgresEventRepository (Unit)', () => {
  let repository: PostgresEventRepository;
  let typeOrmRepositoryMock: jest.Mocked<ConstructorParameters<typeof PostgresEventRepository>[0]>;
  let queryBuilderMock: jest.Mocked<SelectQueryBuilder<EventModel>>;

  beforeEach(() => {
    queryBuilderMock = createMock<SelectQueryBuilder<EventModel>>();
    queryBuilderMock.andWhere.mockReturnThis();
    queryBuilderMock.setParameter.mockReturnThis();
    queryBuilderMock.orderBy.mockReturnThis();
    queryBuilderMock.addOrderBy.mockReturnThis();
    queryBuilderMock.select.mockReturnThis();
    queryBuilderMock.getMany.mockResolvedValue([]);
    queryBuilderMock.getRawOne.mockResolvedValue({ total: '0' });

    typeOrmRepositoryMock = createMock<ConstructorParameters<typeof PostgresEventRepository>[0]>();
    typeOrmRepositoryMock.createQueryBuilder.mockReturnValue(queryBuilderMock);

    repository = new PostgresEventRepository(typeOrmRepositoryMock);
  });

  describe('findAroundMe', () => {
    it('should build a spatial query without optional filters', async () => {
      // Act
      await repository.findAroundMe(48.8566, 2.3522, 10000);

      // Assert
      expect(typeOrmRepositoryMock.createQueryBuilder).toHaveBeenCalledWith('event');
      expect(queryBuilderMock.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('ST_DWithin(event.location::geography'),
      );
      expect(queryBuilderMock.setParameter).toHaveBeenCalledWith('radius', 10000);
      expect(queryBuilderMock.orderBy).toHaveBeenCalledWith(
        expect.stringContaining('ST_Distance'),
        'ASC',
      );
      expect(queryBuilderMock.getMany).toHaveBeenCalled();
    });

    it('should include type and state filters if provided', async () => {
      // Act
      await repository.findAroundMe(
        48.8566,
        2.3522,
        10000,
        EventType.EVENT_TYPE_SOCIAL,
        EventState.EVENT_STATE_PUBLISHED,
      );

      // Assert
      expect(queryBuilderMock.andWhere).toHaveBeenCalledWith('event.type = :type', {
        type: EventType.EVENT_TYPE_SOCIAL,
      });
      expect(queryBuilderMock.andWhere).toHaveBeenCalledWith('event.state = :state', {
        state: EventState.EVENT_STATE_PUBLISHED,
      });
    });
  });
  describe('searchAdvanced', () => {
    it('should build query with basic parameters and return PaginatedEventsVO', async () => {
      const { SearchAdvancedVO } =
        await import('../../value-objects/search-advanced.value-object.js');
      const params = new SearchAdvancedVO(
        undefined,
        undefined,
        undefined,
        undefined,
        'test',
        'org-1',
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        2,
        15,
      );

      const result = await repository.searchAdvanced(params);

      expect(typeOrmRepositoryMock.createQueryBuilder).toHaveBeenCalledWith('event');
      expect(queryBuilderMock.orderBy).toHaveBeenCalledWith('event.createdAt', 'DESC');
      expect(queryBuilderMock.addOrderBy).toHaveBeenCalledWith('event.id', 'DESC');
      expect(queryBuilderMock.andWhere).toHaveBeenCalledWith('event.name ILIKE :searchTerm', {
        searchTerm: '%test%',
      });
      expect(queryBuilderMock.andWhere).toHaveBeenCalledWith('event.organizerId = :organizerId', {
        organizerId: 'org-1',
      });
      expect(queryBuilderMock.skip).toHaveBeenCalledWith(15); // (2-1)*15
      expect(queryBuilderMock.take).toHaveBeenCalledWith(15);

      expect(result.events).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.page).toBe(2);
      expect(result.limit).toBe(15);
    });

    it('should order by distance then id ASC when an area is given', async () => {
      const { SearchAdvancedVO } =
        await import('../../value-objects/search-advanced.value-object.js');
      const params = new SearchAdvancedVO({ lat: 48.85, lng: 2.35, radiusInMeters: 5000 });

      await repository.searchAdvanced(params);

      expect(queryBuilderMock.orderBy).toHaveBeenCalledWith(
        expect.stringContaining('ST_Distance'),
        'ASC',
      );
      expect(queryBuilderMock.addOrderBy).toHaveBeenCalledWith('event.id', 'ASC');
      expect(queryBuilderMock.orderBy).not.toHaveBeenCalledWith('event.createdAt', 'DESC');
    });
  });

  describe('searchAdvanced endAtFrom filter', () => {
    const endAtFrom = new Date('2026-11-07T10:00:00.000Z');
    const endAtFromClause = 'event.endAt >= :endAtFrom';

    const buildParams = async (
      overrides: {
        area?: { lat: number; lng: number; radiusInMeters: number };
        statuses?: EventState[];
        endAtFrom?: Date;
      } = {},
    ) => {
      const { SearchAdvancedVO } =
        await import('../../value-objects/search-advanced.value-object.js');
      return new SearchAdvancedVO(
        overrides.area,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        overrides.statuses,
        1,
        10,
        undefined,
        overrides.endAtFrom,
      );
    };

    it('should filter on event.endAt when endAtFrom is given', async () => {
      await repository.searchAdvanced(await buildParams({ endAtFrom }));

      expect(queryBuilderMock.andWhere).toHaveBeenCalledWith(endAtFromClause, { endAtFrom });
    });

    it('should not add the endAt filter when endAtFrom is absent', async () => {
      await repository.searchAdvanced(await buildParams());

      expect(queryBuilderMock.andWhere).not.toHaveBeenCalledWith(
        endAtFromClause,
        expect.anything(),
      );
    });

    it('should combine endAtFrom with area and statuses', async () => {
      const statuses = [EventState.EVENT_STATE_PUBLISHED];

      await repository.searchAdvanced(
        await buildParams({
          area: { lat: 48.85, lng: 2.35, radiusInMeters: 5000 },
          statuses,
          endAtFrom,
        }),
      );

      expect(queryBuilderMock.andWhere).toHaveBeenCalledWith(endAtFromClause, { endAtFrom });
      expect(queryBuilderMock.andWhere).toHaveBeenCalledWith('event.state IN (:...statuses)', {
        statuses,
      });
      expect(queryBuilderMock.andWhere).toHaveBeenCalledWith(expect.stringContaining('ST_DWithin'));
    });
  });

  describe('findByIds', () => {
    it('should load all ids in a single call, relations by separate queries', async () => {
      typeOrmRepositoryMock.find.mockResolvedValue([]);

      await repository.findByIds(['a', 'b'], ['requirements', 'tags']);

      expect(typeOrmRepositoryMock.find).toHaveBeenCalledTimes(1);
      expect(typeOrmRepositoryMock.find).toHaveBeenCalledWith({
        where: { id: In(['a', 'b']) },
        relations: ['requirements', 'tags'],
        relationLoadStrategy: 'query',
      });
    });

    it('should return the loaded events with their relations, in the order read', async () => {
      registerEventMappings();
      const first = Object.assign(new EventModel(), {
        id: 'b',
        name: 'Second id first',
        tags: [Object.assign(new TagModel(), { id: 't1', slug: 'nature' })],
        requirements: [Object.assign(new RequirementModel(), { id: 'r1', name: 'Gloves' })],
      });
      const second = Object.assign(new EventModel(), {
        id: 'a',
        name: 'First id second',
        tags: [],
        requirements: [],
      });
      typeOrmRepositoryMock.find.mockResolvedValue([first, second]);

      const result = await repository.findByIds(['a', 'b'], ['requirements', 'tags']);

      expect(result.map((event) => event.id)).toEqual(['b', 'a']);
      expect(result[0].tags?.map((tag) => tag.slug)).toEqual(['nature']);
      expect(result[0].requirements?.map((requirement) => requirement.id)).toEqual(['r1']);
      expect(result[1].tags).toEqual([]);
    });

    it('should omit relations when none are requested', async () => {
      typeOrmRepositoryMock.find.mockResolvedValue([]);

      await repository.findByIds(['a']);

      expect(typeOrmRepositoryMock.find).toHaveBeenCalledWith({ where: { id: In(['a']) } });
    });

    it('should return [] without querying for an empty input', async () => {
      expect(await repository.findByIds([])).toEqual([]);
      expect(await repository.findByIds([''])).toEqual([]);
      expect(typeOrmRepositoryMock.find).not.toHaveBeenCalled();
    });

    it('should dedupe and cap at MAX_EVENT_IDS_PER_LOOKUP without throwing', async () => {
      typeOrmRepositoryMock.find.mockResolvedValue([]);
      const ids = Array.from(
        { length: MAX_EVENT_IDS_PER_LOOKUP + 20 },
        (_, i) => `e-${i.toString()}`,
      );

      await repository.findByIds([...ids, 'e-0']);

      expect(typeOrmRepositoryMock.find).toHaveBeenCalledWith({
        where: { id: In(ids.slice(0, MAX_EVENT_IDS_PER_LOOKUP)) },
      });
    });
  });
});
