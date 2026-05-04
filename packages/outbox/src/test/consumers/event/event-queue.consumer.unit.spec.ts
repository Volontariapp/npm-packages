import { describe, expect, it, beforeEach, jest, afterEach } from '@jest/globals';
import { EventQueueConsumer } from '../../../consumers/event-queue.consumer.js';
import {
  makeEventQueueConsumerRepositoryMock,
  type EventQueueConsumerRepositoryMock,
} from '../../utils/helpers/event-queue-repository-mock.helper.js';
import type { LoggerMock } from '../../utils/helpers/logger-mock.helper.js';
import { makeLoggerMock } from '../../utils/helpers/logger-mock.helper.js';
import {
  makeEventQueuePusherMock,
  type EventQueuePusherMock,
} from '../../utils/helpers/event-queue-pusher-mock.helper.js';
import type { EventQueueEntity } from '@volontariapp/database';
import { OutboxStatus } from '@volontariapp/database';
import type { EventQueueDispatcher } from '../../../dispatchers/event-queue.dispatcher.js';

describe('EventQueueConsumer (Unit)', () => {
  let consumer: EventQueueConsumer;
  let repository: EventQueueConsumerRepositoryMock;
  let pusher: EventQueuePusherMock;
  const logger: LoggerMock = makeLoggerMock();

  beforeEach(() => {
    repository = makeEventQueueConsumerRepositoryMock();
    pusher = makeEventQueuePusherMock();
    consumer = new EventQueueConsumer(logger, repository, 10, pusher);
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(consumer).toBeDefined();
  });

  it('fetchPendingItems() should delegate to repository and return results', async () => {
    const mockEntities = [{ id: '1' } as EventQueueEntity, { id: '2' } as EventQueueEntity];
    const toEntitiesSpy = jest.spyOn(repository, 'toEntities').mockReturnValue(mockEntities);
    const executeInTransactionSpy = jest.spyOn(repository, 'executeInTransaction');

    const result = await consumer.fetchPendingItems();

    expect(executeInTransactionSpy).toHaveBeenCalled();
    expect(toEntitiesSpy).toHaveBeenCalled();
    expect(result).toEqual(mockEntities);
  });

  describe('processItems', () => {
    it('should process items, push them and mark them as completed', async () => {
      const entities = [
        { id: '1', status: OutboxStatus.PROCESSING } as EventQueueEntity,
        { id: '2', status: OutboxStatus.PROCESSING } as EventQueueEntity,
      ];
      const dispatcher = (consumer as unknown as { outboxDispatcher: EventQueueDispatcher })
        .outboxDispatcher;
      const completedSpy = jest.spyOn(dispatcher, 'markAsCompleted') as jest.Mock;

      await consumer.processItems(entities);

      expect(pusher.pushElement).toHaveBeenCalledTimes(2);
      expect(pusher.pushElement).toHaveBeenCalledWith(expect.objectContaining({ id: '1' }));
      expect(pusher.pushElement).toHaveBeenCalledWith(expect.objectContaining({ id: '2' }));
      expect(completedSpy).toHaveBeenCalledTimes(2);
      expect(completedSpy).toHaveBeenCalledWith(expect.objectContaining({ id: '1' }));
      expect(completedSpy).toHaveBeenCalledWith(expect.objectContaining({ id: '2' }));
    });

    it('should mark items as failed if pushing throws error', async () => {
      const entities = [{ id: '1', status: OutboxStatus.PROCESSING } as EventQueueEntity];
      const error = new Error('Redis connection lost');
      pusher.pushElement.mockRejectedValueOnce(error);

      const dispatcher = (consumer as unknown as { outboxDispatcher: EventQueueDispatcher })
        .outboxDispatcher;
      const failedSpy = jest.spyOn(dispatcher, 'markAsFailed');
      const completedSpy = jest.spyOn(dispatcher, 'markAsCompleted');

      await consumer.processItems(entities);

      expect(completedSpy).not.toHaveBeenCalled();
      expect(failedSpy).toHaveBeenCalledWith(
        expect.objectContaining({ id: entities[0].id }),
        'Redis connection lost',
      );
    });
  });

  describe('markItemsAsCompleted', () => {
    it('should mark processing items as completed', async () => {
      const entities = [
        { id: '1', status: OutboxStatus.PROCESSING } as EventQueueEntity,
        { id: '2', status: OutboxStatus.PENDING } as EventQueueEntity,
      ];
      const dispatcher = (consumer as unknown as { outboxDispatcher: EventQueueDispatcher })
        .outboxDispatcher;
      const completedSpy = jest.spyOn(dispatcher, 'markAsCompleted') as jest.Mock;

      await consumer.markItemsAsCompleted(entities);

      expect(completedSpy).toHaveBeenCalledTimes(1);
      expect(completedSpy).toHaveBeenCalledWith(expect.objectContaining({ id: '1' }));
    });
  });
});
