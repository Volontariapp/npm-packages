import { describe, expect, it, beforeAll, afterAll, beforeEach } from '@jest/globals';
import {
  databaseMapper,
  JobsOutboxModel,
  JobsOutboxEntity,
  OutboxStatus,
} from '@volontariapp/database';
import type { Repository } from 'typeorm';
import { Redis } from 'ioredis';
import { Queue } from 'bullmq';
import { testDataSource, initializeTestDb, closeTestDb } from '../../data-source.js';
import { TestJobsOutboxRepository } from '../../utils/repositories/jobs-outbox-test.repository.js';
import { makeLoggerMock } from '../../utils/helpers/shared/logger-mock.helper.js';
import {
  JobOutboxRunnerHarness,
  waitForStatus,
} from '../../utils/helpers/shared/outbox-runner.helper.js';
import { clearTestRedis, testRedisOptions } from '../../redis-config.js';

describe('OutboxRunner — Jobs (Integration)', () => {
  let modelRepo: Repository<JobsOutboxModel>;
  let testRepo: TestJobsOutboxRepository;
  let redis: Redis;
  const logger = makeLoggerMock();

  beforeAll(async () => {
    await initializeTestDb();
    databaseMapper.registerBidirectional(JobsOutboxModel, JobsOutboxEntity);
    redis = new Redis({ ...testRedisOptions, lazyConnect: true });
    await redis.connect();
    modelRepo = testDataSource.getRepository(JobsOutboxModel);
    testRepo = new TestJobsOutboxRepository(modelRepo);
  });

  afterAll(async () => {
    await redis.quit();
    await closeTestDb();
  });

  beforeEach(async () => {
    await modelRepo.createQueryBuilder().delete().execute();
    await clearTestRedis();
  });

  it('should pick up a PENDING job, enqueue it in BullMQ, and mark it COMPLETED', async () => {
    // Arrange
    const jobId = '00000000-0000-0000-0001-000000000101';
    const target = 'runner-test-queue';
    await modelRepo.save(
      modelRepo.create({
        id: jobId,
        type: 'user.process',
        emitter: 'ms-user',
        target,
        status: OutboxStatus.PENDING,
        payload: { userId: 'u-job-1' },
        version: 1,
        attempts: 0,
        scheduledAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Partial<JobsOutboxModel>),
    );

    const harness = new JobOutboxRunnerHarness(testRepo, redis, logger);

    // Act
    harness.start();
    await waitForStatus(modelRepo, [jobId], OutboxStatus.COMPLETED);
    await harness.stop();

    // Assert — DB
    const dbRow = await modelRepo.findOneByOrFail({ id: jobId });
    expect(dbRow.status).toBe(OutboxStatus.COMPLETED);

    // Assert — BullMQ
    const queue = new Queue(target, { connection: testRedisOptions });
    try {
      const job = await queue.getJob(jobId);
      expect(job).toBeDefined();
      expect(job?.name).toBe('user.process');
      expect(job?.data).toEqual({ userId: 'u-job-1' });
    } finally {
      await queue.close();
    }
  });

  it('should process multiple jobs targeting different BullMQ queues', async () => {
    // Arrange
    const targets = ['queue-alpha', 'queue-beta', 'queue-gamma'];
    const jobs = targets.map((target, i) =>
      modelRepo.create({
        id: `00000000-0000-0000-0001-0000000002${i.toString().padStart(2, '0')}`,
        type: 'batch.job',
        emitter: 'ms-jobs',
        target,
        status: OutboxStatus.PENDING,
        payload: { index: i },
        version: 1,
        attempts: 0,
        scheduledAt: new Date(),
        createdAt: new Date(Date.now() + i),
        updatedAt: new Date(),
      } as Partial<JobsOutboxModel>),
    );
    await modelRepo.save(jobs);

    const harness = new JobOutboxRunnerHarness(testRepo, redis, logger);

    // Act
    harness.start();
    await waitForStatus(
      modelRepo,
      jobs.map((j) => j.id),
      OutboxStatus.COMPLETED,
    );
    await harness.stop();

    // Assert — one job per BullMQ queue
    const queues = targets.map((t) => new Queue(t, { connection: testRedisOptions }));
    try {
      for (let i = 0; i < queues.length; i++) {
        const job = await queues[i].getJob(jobs[i].id);
        expect(job).toBeDefined();
      }
    } finally {
      await Promise.all(queues.map((q) => q.close()));
    }
  });

  it('should process jobs inserted mid-run (continuous polling)', async () => {
    // Arrange — seed first job
    const firstJobId = '00000000-0000-0000-0001-000000000301';
    const target = 'mid-run-queue';
    await modelRepo.save(
      modelRepo.create({
        id: firstJobId,
        type: 'first.job',
        emitter: 'ms-jobs',
        target,
        status: OutboxStatus.PENDING,
        payload: { order: 1 },
        version: 1,
        attempts: 0,
        scheduledAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Partial<JobsOutboxModel>),
    );

    const harness = new JobOutboxRunnerHarness(testRepo, redis, logger);

    harness.start();
    await waitForStatus(modelRepo, [firstJobId], OutboxStatus.COMPLETED);

    // Insert second job mid-run
    const secondJobId = '00000000-0000-0000-0001-000000000302';
    await modelRepo.save(
      modelRepo.create({
        id: secondJobId,
        type: 'second.job',
        emitter: 'ms-jobs',
        target,
        status: OutboxStatus.PENDING,
        payload: { order: 2 },
        version: 1,
        attempts: 0,
        scheduledAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Partial<JobsOutboxModel>),
    );

    await waitForStatus(modelRepo, [secondJobId], OutboxStatus.COMPLETED);
    await harness.stop();

    // Assert — both jobs in BullMQ
    const queue = new Queue(target, { connection: testRedisOptions });
    try {
      expect(await queue.getJob(firstJobId)).toBeDefined();
      expect(await queue.getJob(secondJobId)).toBeDefined();
    } finally {
      await queue.close();
    }
  });

  it('should mark job as FAILED when BullMQ connection is broken', async () => {
    // Arrange
    const jobId = '00000000-0000-0000-0001-000000000401';
    const target = 'fail-job-queue';
    await modelRepo.save(
      modelRepo.create({
        id: jobId,
        type: 'fail.job',
        emitter: 'ms-jobs',
        target,
        status: OutboxStatus.PENDING,
        payload: { userId: 'u-fail' },
        version: 1,
        attempts: 0,
        scheduledAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Partial<JobsOutboxModel>),
    );

    const harness = await JobOutboxRunnerHarness.createWithBrokenQueue(testRepo, target, logger);

    // Act
    harness.start();
    await waitForStatus(modelRepo, [jobId], OutboxStatus.FAILED);
    await harness.stop();

    // Assert
    const dbRow = await modelRepo.findOneByOrFail({ id: jobId });
    expect(dbRow.status).toBe(OutboxStatus.FAILED);
  });

  it('should complete good jobs and fail bad ones independently (two runners)', async () => {
    // Arrange — insert good job only; bad job is inserted after good runner stops
    const goodJobId = '00000000-0000-0000-0001-000000000501';
    const badJobId = '00000000-0000-0000-0001-000000000502';
    const goodTarget = 'good-job-queue';
    const badTarget = 'bad-job-queue';

    await modelRepo.save(
      modelRepo.create({
        id: goodJobId,
        type: 'good.job',
        emitter: 'ms-jobs',
        target: goodTarget,
        status: OutboxStatus.PENDING,
        payload: { userId: 'u-good' },
        version: 1,
        attempts: 0,
        scheduledAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Partial<JobsOutboxModel>),
    );

    // Good runner — processes only goodJob (bad job not yet in DB)
    const goodHarness = new JobOutboxRunnerHarness(testRepo, redis, logger);
    goodHarness.start();
    await waitForStatus(modelRepo, [goodJobId], OutboxStatus.COMPLETED);
    await goodHarness.stop();

    // Now insert bad job so the broken runner is the only one that can pick it up
    await modelRepo.save(
      modelRepo.create({
        id: badJobId,
        type: 'bad.job',
        emitter: 'ms-jobs',
        target: badTarget,
        status: OutboxStatus.PENDING,
        payload: { userId: 'u-bad' },
        version: 1,
        attempts: 0,
        scheduledAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Partial<JobsOutboxModel>),
    );

    // Broken runner for badJob
    const brokenHarness = await JobOutboxRunnerHarness.createWithBrokenQueue(
      testRepo,
      badTarget,
      logger,
    );
    brokenHarness.start();
    await waitForStatus(modelRepo, [badJobId], OutboxStatus.FAILED);
    await brokenHarness.stop();

    // Assert
    expect((await modelRepo.findOneByOrFail({ id: goodJobId })).status).toBe(
      OutboxStatus.COMPLETED,
    );
    expect((await modelRepo.findOneByOrFail({ id: badJobId })).status).toBe(OutboxStatus.FAILED);

    const goodQueue = new Queue(goodTarget, { connection: testRedisOptions });
    try {
      const job = await goodQueue.getJob(goodJobId);
      expect(job).toBeDefined();
      expect(job?.name).toBe('good.job');
    } finally {
      await goodQueue.close();
    }
  });
});
