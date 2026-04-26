import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import type { QueryRunner, SelectQueryBuilder, UpdateQueryBuilder } from 'typeorm';
import { BaseOutboxConsumer } from '../../outbox/consumers/base.outbox.consumer.js';
import { OutboxModel } from '../../outbox/models/outbox.model.js';
import { OutboxEntity } from '../../outbox/entities/outbox.entity.js';
import { InvalidOutboxSizeError } from '@volontariapp/errors';
import { OutboxStatus } from '../../outbox/types/outbox.status.js';
import { BaseRepository } from '../../core/base.repository.js';

describe('BaseOutboxConsumer (Unit)', () => {
  let consumer: BaseOutboxConsumer<OutboxModel, OutboxEntity>;
  let repositoryMock: jest.Mocked<BaseRepository<OutboxModel, OutboxEntity, string>>;
  let queryRunnerMock: jest.Mocked<QueryRunner>;
  let queryBuilderMock: jest.Mocked<SelectQueryBuilder<OutboxModel> & UpdateQueryBuilder<OutboxModel>>;

  beforeEach(() => {
    queryBuilderMock = {
      setLock: jest.fn().mockReturnThis(),
      setOnLocked: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: jest.fn<() => Promise<OutboxModel[]>>().mockResolvedValue([]),
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      whereInIds: jest.fn().mockReturnThis(),
      execute: jest.fn<() => Promise<any>>().mockResolvedValue({}),
    } as unknown as jest.Mocked<SelectQueryBuilder<OutboxModel> & UpdateQueryBuilder<OutboxModel>>;

    queryRunnerMock = {
      manager: {
        createQueryBuilder: jest.fn().mockReturnValue(queryBuilderMock),
      },
    } as unknown as jest.Mocked<QueryRunner>;

    repositoryMock = {
      metadata: {
        target: OutboxModel,
      },
      executeInTransaction: jest.fn((work: (qr: QueryRunner) => Promise<any>) => work(queryRunnerMock)),
      toEntities: jest.fn((models: OutboxModel[]) => models as unknown as OutboxEntity[]),
    } as unknown as jest.Mocked<BaseRepository<OutboxModel, OutboxEntity, string>>;

    consumer = new BaseOutboxConsumer(repositoryMock);
  });

  describe('fetchWaitingItems', () => {
    it('should throw InvalidOutboxSizeError if size <= 0', async () => {
      await expect(consumer.fetchWaitingItems(0)).rejects.toThrow(InvalidOutboxSizeError);
      await expect(consumer.fetchWaitingItems(-1)).rejects.toThrow(InvalidOutboxSizeError);
    });

    it('should return empty array if no items found', async () => {
      queryBuilderMock.getMany.mockResolvedValueOnce([]);
      const result = await consumer.fetchWaitingItems(10);
      expect(result).toEqual([]);
      expect(queryBuilderMock.update).not.toHaveBeenCalled();
    });

    it('should fetch, mark as processing, and return items', async () => {
      const mockModels: OutboxModel[] = [
        { id: '1', status: OutboxStatus.PENDING, attempts: 0, type: 'test', emitter: 'test', createdAt: new Date() } as OutboxModel,
        { id: '2', status: OutboxStatus.PENDING, attempts: 0, type: 'test', emitter: 'test', createdAt: new Date() } as OutboxModel,
      ];
      queryBuilderMock.getMany
        .mockResolvedValueOnce(mockModels) // First call to get items
        .mockResolvedValueOnce(mockModels); // Second call after update

      const result = await consumer.fetchWaitingItems(2);

      expect(repositoryMock.executeInTransaction).toHaveBeenCalled();
      expect(queryBuilderMock.setLock).toHaveBeenCalledWith('pessimistic_write');
      expect(queryBuilderMock.setOnLocked).toHaveBeenCalledWith('skip_locked');
      expect(queryBuilderMock.where).toHaveBeenCalledWith('outbox.status = :status', {
        status: OutboxStatus.PENDING,
      });
      expect(queryBuilderMock.update).toHaveBeenCalled();
      expect(queryBuilderMock.set).toHaveBeenCalledWith(
        expect.objectContaining({
          status: OutboxStatus.PROCESSING,
        }),
      );
      expect(queryBuilderMock.whereInIds).toHaveBeenCalledWith(['1', '2']);
      expect(result).toHaveLength(2);
    });
  });
});
