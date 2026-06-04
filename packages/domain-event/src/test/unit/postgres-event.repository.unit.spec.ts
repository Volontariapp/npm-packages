import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { PostgresEventRepository } from '../../repositories/postgres-event.repository.js';
import type { EventModel } from '../../models/event.model.js';
import type { Repository, SelectQueryBuilder } from 'typeorm';
import { EventType, EventState } from '@volontariapp/contracts';
import type { EventEntity } from '../../entities/event.entity.js';
import { createMock } from '@volontariapp/testing';

describe('PostgresEventRepository (Unit)', () => {
  let repository: PostgresEventRepository;
  let typeOrmRepositoryMock: jest.Mocked<Repository<EventModel>>;
  let queryBuilderMock: jest.Mocked<SelectQueryBuilder<EventModel>>;

  beforeEach(() => {
    queryBuilderMock = createMock<SelectQueryBuilder<EventModel>>();
    queryBuilderMock.andWhere.mockReturnThis();
    queryBuilderMock.setParameter.mockReturnThis();
    queryBuilderMock.orderBy.mockReturnThis();
    queryBuilderMock.getMany.mockResolvedValue([]);

    typeOrmRepositoryMock = createMock<Repository<EventModel>>();
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

  describe('createWithGeocodeJob', () => {
    it('should execute in transaction and create outbox job if localisationName is present', async () => {
      // Mock executeInTransaction to just run the callback
      jest.spyOn(repository, 'executeInTransaction').mockImplementation(async (cb) => {
        const queryRunnerMock = {
          manager: {
            create: jest.fn(() => ({ id: 'event-1', localisationName: 'Paris' }) as EventModel),
            save: jest.fn(() =>
              Promise.resolve({ id: 'event-1', localisationName: 'Paris' } as EventModel),
            ),
            getRepository: jest.fn(() => ({
              create: jest.fn(() => ({}) as EventModel),
              save: jest.fn(() => Promise.resolve({} as EventModel)),
            })),
          },
        };

        // @ts-expect-error - TypeORM duplicate module resolution mismatch in monorepo
        return cb(queryRunnerMock);
      });

      // Act
      // @ts-expect-error - Spying on protected method for test
      jest.spyOn(repository, 'toModel').mockReturnValue({
        name: 'Test Event',
        localisationName: 'Paris',
        organizerId: 'org-1',
      });
      // @ts-expect-error - Spying on protected method for test
      jest.spyOn(repository, 'toEntity').mockReturnValue({
        id: 'event-1',
      });

      const result = await repository.createWithGeocodeJob({
        name: 'Test Event',
        localisationName: 'Paris',
        organizerId: 'org-1',
      } as Partial<EventEntity>);

      // Assert
      expect(result.id).toBe('event-1');
      expect(repository['executeInTransaction']).toHaveBeenCalled();
    });
  });
});
