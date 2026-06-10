import type { jest } from '@jest/globals';
import { describe, it, expect, beforeEach } from '@jest/globals';
import { PostgresEventRepository } from '../../repositories/postgres-event.repository.js';
import type { EventModel } from '../../models/event.model.js';
import type { SelectQueryBuilder } from 'typeorm';
import { EventType, EventState } from '@volontariapp/contracts';
import { createMock } from '@volontariapp/testing';

describe('PostgresEventRepository (Unit)', () => {
  let repository: PostgresEventRepository;
  let typeOrmRepositoryMock: jest.Mocked<ConstructorParameters<typeof PostgresEventRepository>[0]>;
  let queryBuilderMock: jest.Mocked<SelectQueryBuilder<EventModel>>;

  beforeEach(() => {
    queryBuilderMock = createMock<SelectQueryBuilder<EventModel>>();
    queryBuilderMock.andWhere.mockReturnThis();
    queryBuilderMock.setParameter.mockReturnThis();
    queryBuilderMock.orderBy.mockReturnThis();
    queryBuilderMock.getMany.mockResolvedValue([]);

    typeOrmRepositoryMock = createMock<ConstructorParameters<typeof PostgresEventRepository>[0]>();
    typeOrmRepositoryMock.createQueryBuilder.mockReturnValue(
      queryBuilderMock as unknown as ReturnType<typeof typeOrmRepositoryMock.createQueryBuilder>,
    );

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
});
