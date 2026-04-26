import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import { BaseOutboxConsumer } from '../../outbox/consumers/base.outbox.consumer.js';
import { OutboxModel } from '../../outbox/models/outbox.model.js';
import { OutboxEntity } from '../../outbox/entities/outbox.entity.js';
import { InvalidOutboxSizeError } from '@volontariapp/errors';
import { OutboxStatus } from '../../outbox/types/outbox.status.js';

describe('BaseOutboxConsumer (Unit)', () => {
  let consumer: BaseOutboxConsumer<OutboxModel, OutboxEntity>;
  let repositoryMock: any;
  let queryRunnerMock: any;
  let queryBuilderMock: any;

  beforeEach(() => {
    queryBuilderMock = {
      setLock: jest.fn().mockReturnThis(),
      setOnLocked: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: jest.fn<any>().mockResolvedValue([]),
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      whereInIds: jest.fn().mockReturnThis(),
      execute: jest.fn<any>().mockResolvedValue({}),
    };

    queryRunnerMock = {
      manager: {
        createQueryBuilder: jest.fn().mockReturnValue(queryBuilderMock),
      },
    };

    repositoryMock = {
      metadata: {
        target: OutboxModel,
      },
      executeInTransaction: jest.fn((work: any) => work(queryRunnerMock)),
      toEntities: jest.fn((models: any[]) => models),
    };

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
      const mockModels = [{ id: '1' }, { id: '2' }];
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
