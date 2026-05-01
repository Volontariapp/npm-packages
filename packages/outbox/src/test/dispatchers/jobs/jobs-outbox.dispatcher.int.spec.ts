import { describe, expect, it, beforeAll, afterAll, beforeEach } from '@jest/globals';
import {
  databaseMapper,
  JobsOutboxModel,
  JobsOutboxEntity,
  OutboxStatus,
} from '@volontariapp/database';
import { testDataSource, initializeTestDb, closeTestDb } from '../../data-source.js';
import { JobsOutboxDispatcher } from '../../../dispatchers/jobs-outbox.dispatcher.js';
import { TestJobsOutboxRepository } from '../../utils/repositories/jobs-outbox-test.repository.js';
import { makeLoggerMock } from '../../utils/helpers/logger-mock.helper.js';

describe('JobsOutboxDispatcher (Integration)', () => {
  let dispatcher: JobsOutboxDispatcher;
  let repository: TestJobsOutboxRepository;
  const logger = makeLoggerMock();

  beforeAll(async () => {
    await initializeTestDb();
    databaseMapper.registerBidirectional(JobsOutboxModel, JobsOutboxEntity);
    repository = new TestJobsOutboxRepository(testDataSource.getRepository(JobsOutboxModel));
    dispatcher = new JobsOutboxDispatcher(logger, repository);
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await testDataSource.getRepository(JobsOutboxModel).createQueryBuilder().delete().execute();
  });

  it('markAsProcessing() should update status in database', async () => {
    const repo = testDataSource.getRepository(JobsOutboxModel);
    const job = repo.create({
      id: '00000000-0000-0000-0000-000000000001',
      type: 'test',
      emitter: 'test',
      status: OutboxStatus.PENDING,
      payload: {},
      target: 'test',
      updatedAt: new Date(),
      scheduledAt: new Date(),
    } as Partial<JobsOutboxModel>);
    await repo.save(job);

    const entity = await repository.findOneOrFail({ id: job.id });
    await dispatcher.markAsProcessing(entity);

    const updated = await repo.findOneByOrFail({ id: job.id });
    expect(updated.status).toBe(OutboxStatus.PROCESSING);
  });

  it('markAsFailed() should update status and lastError in database', async () => {
    const repo = testDataSource.getRepository(JobsOutboxModel);
    const job = repo.create({
      id: '00000000-0000-0000-0000-000000000002',
      type: 'test',
      emitter: 'test',
      status: OutboxStatus.PROCESSING,
      payload: {},
      target: 'test',
      updatedAt: new Date(),
      scheduledAt: new Date(),
    } as Partial<JobsOutboxModel>);
    await repo.save(job);

    const entity = await repository.findOneOrFail({ id: job.id });
    const error = 'Job failure';
    await dispatcher.markAsFailed(entity, error);

    const updated = await repo.findOneByOrFail({ id: job.id });
    expect(updated.status).toBe(OutboxStatus.FAILED);
    expect(updated.lastError).toBe(error);
  });

  it('markAsCompleted() should update status to COMPLETED in database', async () => {
    const repo = testDataSource.getRepository(JobsOutboxModel);
    const job = repo.create({
      id: '00000000-0000-0000-0000-000000000003',
      type: 'test',
      emitter: 'test',
      status: OutboxStatus.PROCESSING,
      payload: {},
      target: 'test',
      updatedAt: new Date(),
      scheduledAt: new Date(),
    } as Partial<JobsOutboxModel>);
    await repo.save(job);

    const entity = await repository.findOneOrFail({ id: job.id });
    await dispatcher.markAsCompleted(entity);

    const updated = await repo.findOneByOrFail({ id: job.id });
    expect(updated.status).toBe(OutboxStatus.COMPLETED);
  });
});
