import { describe, expect, it, beforeEach } from '@jest/globals';
import {
  type BaseRepository,
  JobsOutboxEntity,
  JobsOutboxModel,
  OutboxStatus,
} from '@volontariapp/database';
import { JobsOutboxWriter } from '../../../outbox/writer/jobs-outbox.writer.js';
import { makeJobsOutboxEvent } from '../../utils/helpers/jobs-outbox-event.helper.js';
import { makeLoggerMock, type TestLoggerMock } from '../../utils/helpers/logger-mock.helper.js';
import { makeJobsOutboxRepositoryMock } from '../../utils/helpers/jobs-outbox-repository-mock.helper.js';

describe('JobsOutboxWriter (Unit)', () => {
  let writer: JobsOutboxWriter;
  let repository: BaseRepository<JobsOutboxModel, JobsOutboxEntity, string>;
  let logger: TestLoggerMock;

  beforeEach(() => {
    repository = makeJobsOutboxRepositoryMock();
    logger = makeLoggerMock();
    writer = new JobsOutboxWriter(
      logger as never,
      repository,
    );
  });

  it('create() should pass default values when not overridden', async () => {
    const event = makeJobsOutboxEvent();

    await writer.create(event);

    expect(repository.create).toHaveBeenCalledTimes(1);
    const created = repository.create.mock.calls[0][0];
    expect(created.status).toBe(OutboxStatus.PENDING);
    expect(created.attempts).toBe(0);
    expect(created.target).toBe('queue:default');
    expect(created.payload).toEqual({ action: 'process-user', data: { userId: 'u-1' } });
  });

  it('create() should keep overridden values when provided', async () => {
    const event = makeJobsOutboxEvent({
      status: OutboxStatus.PROCESSING,
      attempts: 3,
      target: 'queue:high-priority',
      payload: { action: 'retry-job', data: { userId: 'u-42' } },
    });

    await writer.create(event);

    expect(repository.create).toHaveBeenCalledTimes(1);
    const created = repository.create.mock.calls[0][0];
    expect(created.status).toBe(OutboxStatus.PROCESSING);
    expect(created.attempts).toBe(3);
    expect(created.target).toBe('queue:high-priority');
    expect(created.payload).toEqual({ action: 'retry-job', data: { userId: 'u-42' } });
  });
});
