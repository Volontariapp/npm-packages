import { describe, it, expect, beforeEach, afterAll, beforeAll } from '@jest/globals';
import {
  databaseMapper,
  JobsOutboxModel,
  JobsOutboxEntity,
  OutboxStatus,
} from '@volontariapp/database';
import { testDataSource, initializeTestDb, closeTestDb } from '../data-source.js';
import { JobsOutboxRepository } from '../../repositories/jobs-outbox.repository.js';
import { randomUUID } from 'node:crypto';

describe('JobsOutboxRepository Integration', () => {
  let repository: JobsOutboxRepository;

  beforeAll(async () => {
    await initializeTestDb();
    databaseMapper.registerBidirectional(JobsOutboxModel, JobsOutboxEntity);
    repository = new JobsOutboxRepository(testDataSource);
  });

  afterAll(async () => {
    await closeTestDb().catch(() => undefined);
  });

  beforeEach(async () => {
    const rawRepo = testDataSource.getRepository(JobsOutboxModel);
    await rawRepo.createQueryBuilder().delete().execute();
  });

  it('should check if a job exists', async () => {
    const jobId = randomUUID();

    let exists = await repository.exists({ id: jobId });
    expect(exists).toBe(false);

    const rawRepo = testDataSource.getRepository(JobsOutboxModel);
    const job = rawRepo.create({
      id: jobId,
      type: 'test-job',
      emitter: 'test-emitter',
      emitterId: '00000000-0000-0000-0000-000000000000',
      target: 'test-target',
      status: OutboxStatus.PENDING,
      attempts: 0,
      payload: { action: 'test', data: {} },
      scheduledAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Partial<JobsOutboxModel>);
    await rawRepo.save(job);

    exists = await repository.exists({ id: jobId });
    expect(exists).toBe(true);
  });

  it('should find a job by id', async () => {
    const jobId = randomUUID();

    let entity = await repository.findById(jobId);
    expect(entity).toBeNull();

    const rawRepo = testDataSource.getRepository(JobsOutboxModel);
    const job = rawRepo.create({
      id: jobId,
      type: 'test-job',
      emitter: 'test-emitter',
      emitterId: '00000000-0000-0000-0000-000000000000',
      target: 'test-target',
      status: OutboxStatus.PENDING,
      attempts: 0,
      payload: { action: 'test', data: {} },
      scheduledAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Partial<JobsOutboxModel>);
    await rawRepo.save(job);

    entity = await repository.findById(jobId);
    expect(entity).toBeDefined();
    expect(entity?.id).toBe(jobId);
    expect(entity?.status).toBe(OutboxStatus.PENDING);
  });
});
