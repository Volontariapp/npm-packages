import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import { JobsOutboxConsumer } from '../../../consumers/jobs-outbox.consumer.js';
import {
  makeJobsOutboxConsumerRepositoryMock,
  type JobsOutboxConsumerRepositoryMock,
} from '../../utils/helpers/jobs-outbox-repository-mock.helper.js';
import { makeLoggerMock } from '../../utils/helpers/logger-mock.helper.js';
import type { JobsOutboxEntity, JobsOutboxModel } from '@volontariapp/database';
import { type BaseRepository, OutboxStatus } from '@volontariapp/database';
import type { Logger } from '@volontariapp/logger';
import type { JobsOutboxDispatcher } from '../../../dispatchers/jobs-outbox.dispatcher.js';

describe('JobsOutboxConsumer (Unit)', () => {
  let consumer: JobsOutboxConsumer;
  let repository: JobsOutboxConsumerRepositoryMock;
  const logger = makeLoggerMock();

  beforeEach(() => {
    repository = makeJobsOutboxConsumerRepositoryMock();
    consumer = new JobsOutboxConsumer(
      logger as unknown as Logger,
      repository as BaseRepository<JobsOutboxModel, JobsOutboxEntity, string>,
      10,
    );
  });

  it('should be defined', () => {
    expect(consumer).toBeDefined();
  });

  it('fetchPendingItems() should delegate to repository and return results', async () => {
    const mockEntities = [{ id: '1' }, { id: '2' }];
    repository.toEntities.mockReturnValue(mockEntities as JobsOutboxEntity[]);

    const result = await consumer.fetchPendingItems();

    expect(repository.executeInTransaction).toHaveBeenCalled();
    expect(result).toEqual(mockEntities);
  });

  describe('processItems', () => {
    it('should process items and mark them as completed', async () => {
      const entities = [
        { id: '1', status: OutboxStatus.PROCESSING } as JobsOutboxEntity,
        { id: '2', status: OutboxStatus.PROCESSING } as JobsOutboxEntity,
      ];
      const dispatcherSpy = jest.spyOn(
        (consumer as unknown as { outboxDispatcher: JobsOutboxDispatcher }).outboxDispatcher,
        'markAsCompleted',
      );

      await consumer.processItems(entities);

      expect(dispatcherSpy).toHaveBeenCalledTimes(2);
      expect(dispatcherSpy).toHaveBeenCalledWith(entities[0]);
      expect(dispatcherSpy).toHaveBeenCalledWith(entities[1]);
    });
  });

  describe('markItemsAsCompleted', () => {
    it('should mark processing items as completed', async () => {
      const entities = [
        { id: '1', status: OutboxStatus.PROCESSING } as JobsOutboxEntity,
        { id: '2', status: OutboxStatus.PENDING } as JobsOutboxEntity,
      ];
      const dispatcherSpy = jest.spyOn(
        (consumer as unknown as { outboxDispatcher: JobsOutboxDispatcher }).outboxDispatcher,
        'markAsCompleted',
      );

      await consumer.markItemsAsCompleted(entities);

      expect(dispatcherSpy).toHaveBeenCalledTimes(1);
      expect(dispatcherSpy).toHaveBeenCalledWith(entities[0]);
    });
  });
});
