import { describe, expect, it, beforeEach, jest, afterEach } from '@jest/globals';
import type { QueryRunner, UpdateQueryBuilder } from 'typeorm';
import { OutboxConsumer } from '../../../outbox/consumers/outbox.consumer.js';
import type { OutboxDispatcher } from '../../../outbox/dispatchers/outbox.dispatcher.js';
import { OutboxModel } from '../../../outbox/models/outbox.model.js';
import type { OutboxEntity } from '../../../outbox/entities/outbox.entity.js';
import { InvalidOutboxSizeError } from '@volontariapp/errors';
import { OutboxStatus } from '../../../outbox/types/outbox.status.js';
import type { BaseRepository } from '../../../core/base.repository.js';
import { makeLoggerMock, type LoggerMock } from '../../utils/helpers/logger-mock.helper.js';
import { makeQueryRunnerMock } from '../../utils/helpers/query-runner-mock.helper.js';
import { makeOutboxPusherMock } from '../../utils/helpers/outbox-pusher-mock.helper.js';
import type { OutboxPusher } from '../../../outbox/pushers/outbox.pusher.js';

describe('OutboxConsumer (Unit)', () => {
  let consumer: OutboxConsumer<OutboxModel, OutboxEntity>;
  let dispatcherMock: jest.Mocked<OutboxDispatcher<OutboxModel, OutboxEntity>>;
  let repositoryMock: jest.Mocked<BaseRepository<OutboxModel, OutboxEntity, string>>;
  let pusherMock: jest.Mocked<OutboxPusher<OutboxEntity>>;
  let queryRunnerMock: QueryRunner;
  let loggerMock: LoggerMock;

  beforeEach(() => {
    loggerMock = makeLoggerMock();
    const { queryRunnerMock: qrMock } = makeQueryRunnerMock();
    queryRunnerMock = qrMock as unknown as QueryRunner;

    repositoryMock = {
      metadata: {
        target: OutboxModel,
        tableName: 'outbox',
      } as unknown as BaseRepository<OutboxModel, OutboxEntity, string>['metadata'],
      executeInTransaction: jest.fn(<TResult>(work: (qr: QueryRunner) => Promise<TResult>) =>
        work(queryRunnerMock),
      ),
      toEntities: jest.fn((models: OutboxModel[]) => models as unknown as OutboxEntity[]),
      update: jest.fn(),
    } as unknown as jest.Mocked<BaseRepository<OutboxModel, OutboxEntity, string>>;

    dispatcherMock = {
      markAsCompleted: jest.fn(),
      markAsFailed: jest.fn(),
      markAsProcessing: jest.fn(),
    } as unknown as jest.Mocked<OutboxDispatcher<OutboxModel, OutboxEntity>>;

    pusherMock = makeOutboxPusherMock();

    consumer = new OutboxConsumer(loggerMock, repositoryMock, 10, dispatcherMock, pusherMock);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should throw InvalidOutboxSizeError if batchSize <= 0', () => {
      expect(
        () => new OutboxConsumer(loggerMock, repositoryMock, 0, dispatcherMock, pusherMock),
      ).toThrow(InvalidOutboxSizeError);
      expect(
        () => new OutboxConsumer(loggerMock, repositoryMock, -1, dispatcherMock, pusherMock),
      ).toThrow(InvalidOutboxSizeError);
    });
  });

  describe('fetchPendingItems', () => {
    it('should return empty array if no items found', async () => {
      const qb =
        queryRunnerMock.manager.createQueryBuilder() as unknown as UpdateQueryBuilder<OutboxModel>;
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

  describe('processItems', () => {
    it('should process items, push them and mark them as completed', async () => {
      const entities = [{ id: '1' } as OutboxEntity, { id: '2' } as OutboxEntity];
      const completedSpy = jest.spyOn(dispatcherMock, 'markAsCompleted');
      const pushSpy = jest.spyOn(pusherMock, 'pushElement');

      await consumer.processItems(entities);

      expect(pushSpy).toHaveBeenCalledTimes(2);
      expect(pushSpy).toHaveBeenCalledWith(entities[0]);
      expect(pushSpy).toHaveBeenCalledWith(entities[1]);
      expect(completedSpy).toHaveBeenCalledTimes(2);
      expect(completedSpy).toHaveBeenCalledWith(entities[0]);
      expect(completedSpy).toHaveBeenCalledWith(entities[1]);
    });

    it('should mark items as failed if pushing throws error', async () => {
      const entities = [{ id: '1' } as OutboxEntity];
      const error = new Error('Push error');
      jest.spyOn(pusherMock, 'pushElement').mockRejectedValueOnce(error);
      const failedSpy = jest.spyOn(dispatcherMock, 'markAsFailed');
      const completedSpy = jest.spyOn(dispatcherMock, 'markAsCompleted');

      await consumer.processItems(entities);

      expect(completedSpy).not.toHaveBeenCalled();
      expect(failedSpy).toHaveBeenCalledWith(entities[0], 'Push error');
    });

    it('should mark items as failed if marking as completed throws error', async () => {
      const entities = [{ id: '1' } as OutboxEntity];
      const error = new Error('Test error');
      const completedSpy = jest
        .spyOn(dispatcherMock, 'markAsCompleted')
        .mockRejectedValueOnce(error);
      const failedSpy = jest.spyOn(dispatcherMock, 'markAsFailed');

      await consumer.processItems(entities);

      expect(completedSpy).toHaveBeenCalledWith(entities[0]);
      expect(failedSpy).toHaveBeenCalledWith(entities[0], 'Test error');
    });
  });

  describe('markItemsAsCompleted', () => {
    it('should mark processing items as completed', async () => {
      const entities = [
        { id: '1', status: OutboxStatus.PROCESSING } as OutboxEntity,
        { id: '2', status: OutboxStatus.PENDING } as OutboxEntity,
      ];
      const completedSpy = jest.spyOn(dispatcherMock, 'markAsCompleted');
      const warnSpy = jest.spyOn(loggerMock, 'warn');

      await consumer.markItemsAsCompleted(entities);

      expect(completedSpy).toHaveBeenCalledTimes(1);
      expect(completedSpy).toHaveBeenCalledWith(entities[0]);
      expect(warnSpy).toHaveBeenCalledWith('Skipping outbox item 2', {
        status: OutboxStatus.PENDING,
      });
    });
  });
});
