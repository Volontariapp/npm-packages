import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import type { QueryRunner } from 'typeorm';
import { OutboxConsumer } from '../../outbox/consumers/outbox.consumer.js';
import { OutboxModel } from '../../outbox/models/outbox.model.js';
import type { OutboxEntity } from '../../outbox/entities/outbox.entity.js';
import { InvalidOutboxSizeError } from '@volontariapp/errors';
import { OutboxStatus } from '../../outbox/types/outbox.status.js';
import type { BaseRepository } from '../../core/base.repository.js';
import { makeLoggerMock, type TestLoggerMock } from '../utils/helpers/logger-mock.helper.js';

describe('OutboxConsumer (Unit)', () => {
  let consumer: OutboxConsumer<OutboxModel, OutboxEntity>;
  let repositoryMock: jest.Mocked<BaseRepository<OutboxModel, OutboxEntity, string>>;
  let queryRunnerMock: jest.Mocked<QueryRunner>;
  let loggerMock: TestLoggerMock;

  beforeEach(() => {
    loggerMock = makeLoggerMock();
    queryRunnerMock = {
      query: jest.fn<() => Promise<unknown>>().mockResolvedValue([]),
    } as unknown as jest.Mocked<QueryRunner>;

    repositoryMock = {
      metadata: {
        target: OutboxModel,
        tableName: 'outbox',
      },
      executeInTransaction: jest.fn((work: (qr: QueryRunner) => Promise<unknown>) =>
        work(queryRunnerMock),
      ),
      toEntities: jest.fn((models: OutboxModel[]) => models as unknown as OutboxEntity[]),
    } as unknown as jest.Mocked<BaseRepository<OutboxModel, OutboxEntity, string>>;

    consumer = new OutboxConsumer(loggerMock as never, repositoryMock, 10);
  });

  describe('constructor', () => {
    it('should throw InvalidOutboxSizeError if batchSize <= 0', () => {
      expect(() => new OutboxConsumer(loggerMock as never, repositoryMock, 0)).toThrow(
        InvalidOutboxSizeError,
      );
      expect(() => new OutboxConsumer(loggerMock as never, repositoryMock, -1)).toThrow(
        InvalidOutboxSizeError,
      );
    });
  });

  describe('fetchPendingItems', () => {
    it('should return empty array if no items found', async () => {
      queryRunnerMock.query.mockResolvedValueOnce([]);
      const result = await consumer.fetchPendingItems();
      expect(result).toEqual([]);
    });

    it('should fetch, mark as processing, and return items', async () => {
      const rawRows = [
        {
          id: '1',
          status: OutboxStatus.PENDING,
          attempts: 0,
          type: 'test',
          emitter: 'test',
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: '2',
          status: OutboxStatus.PENDING,
          attempts: 0,
          type: 'test',
          emitter: 'test',
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      queryRunnerMock.query.mockResolvedValueOnce(rawRows);

      const result = await consumer.fetchPendingItems();

      expect(repositoryMock.executeInTransaction).toHaveBeenCalled();
      expect(queryRunnerMock.query).toHaveBeenCalledWith(expect.stringContaining('UPDATE'), [
        OutboxStatus.PROCESSING,
        OutboxStatus.PENDING,
        10,
      ]);

      expect(result).toHaveLength(2);
    });
  });
});
