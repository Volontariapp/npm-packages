import { describe, expect, it, beforeEach } from '@jest/globals';
import { EventQueueConsumer } from '../../../consumers/event-queue.consumer.js';
import {
  makeEventQueueConsumerRepositoryMock,
  type EventQueueConsumerRepositoryMock,
} from '../../utils/helpers/event-queue-repository-mock.helper.js';
import { makeLoggerMock } from '../../utils/helpers/logger-mock.helper.js';
import type { BaseRepository, EventQueueEntity, EventQueueModel } from '@volontariapp/database';

describe('EventQueueConsumer (Unit)', () => {
  let consumer: EventQueueConsumer;
  let repository: EventQueueConsumerRepositoryMock;
  const logger = makeLoggerMock();

  beforeEach(() => {
    repository = makeEventQueueConsumerRepositoryMock();
    consumer = new EventQueueConsumer(
      logger,
      repository as unknown as BaseRepository<EventQueueModel, EventQueueEntity, string>,
      10,
    );
  });

  it('should be defined', () => {
    expect(consumer).toBeDefined();
  });

  it('fetchPendingItems() should delegate to repository and return results', async () => {
    const mockEntities = [{ id: '1' }, { id: '2' }];
    repository.toEntities.mockReturnValue(mockEntities as unknown as EventQueueEntity[]);

    const result = await consumer.fetchPendingItems();

    expect(repository.executeInTransaction).toHaveBeenCalled();
    expect(result).toEqual(mockEntities);
  });
});
