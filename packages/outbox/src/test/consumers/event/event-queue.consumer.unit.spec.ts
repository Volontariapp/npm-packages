import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import { EventQueueConsumer } from '../../../consumers/event-queue.consumer.js';
import {
  makeEventQueueConsumerRepositoryMock,
  type EventQueueConsumerRepositoryMock,
} from '../../utils/helpers/event-queue-repository-mock.helper.js';
import { makeLoggerMock } from '../../utils/helpers/logger-mock.helper.js';
import type { EventQueueEntity, EventQueueModel } from '@volontariapp/database';
import { type BaseRepository, OutboxStatus } from '@volontariapp/database';
import type { Logger } from '@volontariapp/logger';
import type { EventQueueDispatcher } from '../../../dispatchers/event-queue.dispatcher.js';

describe('EventQueueConsumer (Unit)', () => {
  let consumer: EventQueueConsumer;
  let repository: EventQueueConsumerRepositoryMock;
  const logger = makeLoggerMock();

  beforeEach(() => {
    repository = makeEventQueueConsumerRepositoryMock();
    consumer = new EventQueueConsumer(
      logger as unknown as Logger,
      repository as BaseRepository<EventQueueModel, EventQueueEntity, string>,
      10,
    );
  });

  it('should be defined', () => {
    expect(consumer).toBeDefined();
  });

  it('fetchPendingItems() should delegate to repository and return results', async () => {
    const mockEntities = [{ id: '1' }, { id: '2' }];
    repository.toEntities.mockReturnValue(mockEntities as EventQueueEntity[]);

    const result = await consumer.fetchPendingItems();

    expect(repository.executeInTransaction).toHaveBeenCalled();
    expect(result).toEqual(mockEntities);
  });

  describe('processItems', () => {
    it('should process items and mark them as completed', async () => {
      const entities = [
        { id: '1', status: OutboxStatus.PROCESSING } as EventQueueEntity,
        { id: '2', status: OutboxStatus.PROCESSING } as EventQueueEntity,
      ];
      const dispatcherSpy = jest.spyOn(
        (consumer as unknown as { outboxDispatcher: EventQueueDispatcher }).outboxDispatcher,
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
        { id: '1', status: OutboxStatus.PROCESSING } as EventQueueEntity,
        { id: '2', status: OutboxStatus.PENDING } as EventQueueEntity,
      ];
      const dispatcherSpy = jest.spyOn(
        (consumer as unknown as { outboxDispatcher: EventQueueDispatcher }).outboxDispatcher,
        'markAsCompleted',
      );

      await consumer.markItemsAsCompleted(entities);

      expect(dispatcherSpy).toHaveBeenCalledTimes(1);
      expect(dispatcherSpy).toHaveBeenCalledWith(entities[0]);
    });
  });
});
