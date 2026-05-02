import { describe, expect, it, beforeEach, jest, afterEach } from '@jest/globals';
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
import type { JobsOutboxPusher } from '../../../pushers/jobs-outbox.pusher.js';

describe('JobsOutboxConsumer (Unit)', () => {
  let consumer: JobsOutboxConsumer;
  let repository: JobsOutboxConsumerRepositoryMock;
  let pusher: jest.Mocked<JobsOutboxPusher>;
  const logger = makeLoggerMock();

  beforeEach(() => {
    repository = makeJobsOutboxConsumerRepositoryMock();
    pusher = {
      pushElement: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
      pushBulkElement: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
      close: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<JobsOutboxPusher>;
    consumer = new JobsOutboxConsumer(
      logger as unknown as Logger,
      repository as BaseRepository<JobsOutboxModel, JobsOutboxEntity, string>,
      10,
      pusher,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(consumer).toBeDefined();
  });

  it('fetchPendingItems() should delegate to repository and return results', async () => {
    const mockEntities = [{ id: '1' } as JobsOutboxEntity, { id: '2' } as JobsOutboxEntity];
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
        { id: '1', status: OutboxStatus.PROCESSING } as JobsOutboxEntity,
        { id: '2', status: OutboxStatus.PROCESSING } as JobsOutboxEntity,
      ];
      const dispatcher = (consumer as unknown as { outboxDispatcher: JobsOutboxDispatcher })
        .outboxDispatcher;
      const completedSpy = jest.spyOn(dispatcher, 'markAsCompleted');

      await consumer.processItems(entities);

      expect(pusher.pushElement).toHaveBeenCalledTimes(2);
      expect(pusher.pushElement).toHaveBeenCalledWith(entities[0]);
      expect(pusher.pushElement).toHaveBeenCalledWith(entities[1]);
      const spyMock = completedSpy as jest.Mock;
      expect(spyMock).toHaveBeenCalledTimes(2);
      expect(spyMock).toHaveBeenCalledWith(entities[0]);
      expect(spyMock).toHaveBeenCalledWith(entities[1]);
    });
  });

  describe('markItemsAsCompleted', () => {
    it('should mark processing items as completed', async () => {
      const entities = [
        { id: '1', status: OutboxStatus.PROCESSING } as JobsOutboxEntity,
        { id: '2', status: OutboxStatus.PENDING } as JobsOutboxEntity,
      ];
      const dispatcher = (consumer as unknown as { outboxDispatcher: JobsOutboxDispatcher })
        .outboxDispatcher;
      const completedSpy = jest.spyOn(dispatcher, 'markAsCompleted');

      await consumer.markItemsAsCompleted(entities);

      const spyMock = completedSpy as jest.Mock;
      expect(spyMock).toHaveBeenCalledTimes(1);
      expect(spyMock).toHaveBeenCalledWith(entities[0]);
    });
  });
});
