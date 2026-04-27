import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import type { QueryRunner, UpdateQueryBuilder } from 'typeorm';
import { OutboxConsumer } from '../../outbox/consumers/outbox.consumer.js';
import { OutboxModel } from '../../outbox/models/outbox.model.js';
import type { OutboxEntity } from '../../outbox/entities/outbox.entity.js';
import { InvalidOutboxSizeError } from '@volontariapp/errors';
import { OutboxStatus } from '../../outbox/types/outbox.status.js';
import type { BaseRepository } from '../../core/base.repository.js';
import { makeLoggerMock, type TestLoggerMock } from '../utils/helpers/logger-mock.helper.js';
import { makeQueryRunnerMock } from '../utils/helpers/query-runner-mock.helper.js';

describe('OutboxConsumer (Unit)', () => {
  let consumer: OutboxConsumer<OutboxModel, OutboxEntity>;
  let repositoryMock: jest.Mocked<BaseRepository<OutboxModel, OutboxEntity, string>>;
  let queryRunnerMock: jest.Mocked<QueryRunner>;
  let loggerMock: TestLoggerMock;

  beforeEach(() => {
    loggerMock = makeLoggerMock();
    const mocks = makeQueryRunnerMock();
    queryRunnerMock = mocks.queryRunnerMock;

    repositoryMock = {
      metadata: {
        target: OutboxModel,
        tableName: 'outbox',
      },
      executeInTransaction(work: (qr: QueryRunner) => Promise<unknown>) {
        return work(queryRunnerMock);
      },
      toEntities(models: OutboxModel[]) {
        return models as unknown as OutboxEntity[];
      },
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
      const qb = queryRunnerMock.manager.createQueryBuilder();
      const executeSpy = jest
        .spyOn(qb, 'execute')
        .mockResolvedValueOnce({ raw: [], generatedMaps: [], affected: 0 });

      const result = await consumer.fetchPendingItems();

      expect(result).toEqual([]);
      expect(executeSpy).toHaveBeenCalled();
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

      const qb =
        queryRunnerMock.manager.createQueryBuilder() as unknown as UpdateQueryBuilder<OutboxModel>;
      const executeSpy = jest
        .spyOn(qb, 'execute')
        .mockResolvedValueOnce({ raw: rawRows, generatedMaps: [], affected: rawRows.length });
      const updateSpy = jest.spyOn(qb, 'update');
      const setSpy = jest.spyOn(qb, 'set');
      const createQBSpy = jest.spyOn(queryRunnerMock.manager, 'createQueryBuilder');

      const result = await consumer.fetchPendingItems();

      expect(createQBSpy).toHaveBeenCalled();
      expect(updateSpy).toHaveBeenCalled();
      expect(setSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          status: OutboxStatus.PROCESSING,
        }),
      );
      expect(executeSpy).toHaveBeenCalled();
      expect(result).toHaveLength(2);
    });
  });
});
