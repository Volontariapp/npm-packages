import { describe, expect, it, beforeEach } from '@jest/globals';
import {
  OutboxStatus,
  type BaseRepository,
  type JobsOutboxEntity,
  type JobsOutboxModel,
} from '@volontariapp/database';
import { JobsOutboxWriter } from '../../../writers/jobs-outbox.writer.js';
import { makeJobsOutboxEvent } from '../../utils/helpers/jobs-outbox-event.helper.js';
import { makeLoggerMock } from '../../utils/helpers/logger-mock.helper.js';
import {
  makeJobsOutboxRepositoryMock,
  type JobsOutboxRepositoryMock,
} from '../../utils/helpers/jobs-outbox-repository-mock.helper.js';

describe('JobsOutboxWriter (Unit)', () => {
  let writer: JobsOutboxWriter;
  let repository: JobsOutboxRepositoryMock;

  beforeEach(() => {
    repository = makeJobsOutboxRepositoryMock();
    const logger = makeLoggerMock();
    writer = new JobsOutboxWriter(
      logger,
      repository as unknown as BaseRepository<JobsOutboxModel, JobsOutboxEntity, string>,
    );
  });

  it('create() should pass default values when not overridden', async () => {
    const event = makeJobsOutboxEvent();

    await writer.create(event);

    expect(repository.create).toHaveBeenCalledTimes(1);
    const created = repository.create.mock.calls[0][0];
    expect(created.status).toBe(OutboxStatus.PENDING);
    expect(created.attempts).toBe(0);
    expect(created.payload).toEqual({ action: 'process-user', data: { userId: 'u-1' } });
  });

  it('create() should keep overridden values when provided', async () => {
    const event = makeJobsOutboxEvent({
      status: OutboxStatus.FAILED,
      attempts: 2,
      payload: {
        action: 'overridden-job',
        data: { id: 'entity-2' },
      },
    });

    await writer.create(event);

    expect(repository.create).toHaveBeenCalledTimes(1);
    const created = repository.create.mock.calls[0][0];
    expect(created.status).toBe(OutboxStatus.FAILED);
    expect(created.attempts).toBe(2);
    expect(created.payload).toEqual({
      action: 'overridden-job',
      data: { id: 'entity-2' },
    });
  });
});
