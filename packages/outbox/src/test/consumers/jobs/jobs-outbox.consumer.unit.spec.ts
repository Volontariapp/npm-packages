import { describe, expect, it, beforeEach } from '@jest/globals';
import { JobsOutboxConsumer } from '../../../consumers/jobs-outbox.consumer.js';
import {
  makeJobsOutboxConsumerRepositoryMock,
  type JobsOutboxConsumerRepositoryMock,
} from '../../utils/helpers/jobs-outbox-repository-mock.helper.js';
import { makeLoggerMock } from '../../utils/helpers/logger-mock.helper.js';
import type { BaseRepository, JobsOutboxEntity, JobsOutboxModel } from '@volontariapp/database';

describe('JobsOutboxConsumer (Unit)', () => {
  let consumer: JobsOutboxConsumer;
  let repository: JobsOutboxConsumerRepositoryMock;
  const logger = makeLoggerMock();

  beforeEach(() => {
    repository = makeJobsOutboxConsumerRepositoryMock();
    consumer = new JobsOutboxConsumer(
      logger,
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
});
