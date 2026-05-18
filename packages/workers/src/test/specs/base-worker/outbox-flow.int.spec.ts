import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
  jest,
} from '@jest/globals';
import type { Repository } from 'typeorm';
import { Worker, type Job as BullMQJob } from 'bullmq';
import { Redis } from 'ioredis';
import {
  databaseMapper,
  JobsOutboxModel,
  JobsOutboxEntity,
  OutboxStatus,
  JobAuditModel,
  JobAuditStatus,
} from '@volontariapp/database';
import {
  JobOutboxRunnerHarness,
  TestJobsOutboxRepository,
  waitForStatus as waitOutboxStatus,
} from '@volontariapp/outbox/testing';
import { testDataSource, initializeTestDb, closeTestDb } from '../../data-source.js';
import { clearTestRedis } from '../../utils/index.js';
import { JobAuditEntity } from '../../../data/entities/job-audit.entity.js';
import { JobAuditRepository } from '../../../data/repositories/job-audit.repository.js';
import { TestWorker } from '../../utils/index.js';
import { testRedisOptions } from '../../redis-config.js';

describe('Outbox to Worker E2E Flow — Integration', () => {
  let outboxRepo: Repository<JobsOutboxModel>;
  let auditRepoModel: Repository<JobAuditModel>;
  let auditRepo: JobAuditRepository;
  let redisClient: Redis;
  let bullmqWorker: Worker | null = null;

  beforeAll(async () => {
    databaseMapper.registerBidirectional(JobsOutboxModel, JobsOutboxEntity);
    databaseMapper.registerBidirectional(JobAuditModel, JobAuditEntity);

    await initializeTestDb();

    outboxRepo = testDataSource.getRepository(JobsOutboxModel);
    auditRepoModel = testDataSource.getRepository(JobAuditModel);
    auditRepo = new JobAuditRepository(auditRepoModel);

    redisClient = new Redis(testRedisOptions);
  });

  afterAll(async () => {
    await redisClient.quit();
    await closeTestDb();
  });

  beforeEach(async () => {
    await outboxRepo.createQueryBuilder().delete().execute();
    await auditRepoModel.createQueryBuilder().delete().execute();
    await clearTestRedis();
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  afterEach(async () => {
    if (bullmqWorker) {
      await bullmqWorker.close();
      bullmqWorker = null;
    }
  });

  async function waitForAuditStatus(
    jobId: string,
    expectedStatus: JobAuditStatus,
    timeoutMs = 5000,
  ): Promise<JobAuditModel> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const audit = await auditRepoModel.findOneBy({ jobId });
      if (audit && audit.status === expectedStatus) {
        return audit;
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    throw new Error(`Timeout waiting for job audit ${jobId} to reach status ${expectedStatus}`);
  }

  it('should process a job from jobs_outbox table, push to redis, and succeed execution on worker', async () => {
    const jobId = '00000000-0000-0000-0000-000000000001';

    const testOutboxRepo = new TestJobsOutboxRepository(outboxRepo);
    const harness = new JobOutboxRunnerHarness(testOutboxRepo, redisClient);

    const testWorker = new TestWorker(auditRepo);
    const processedEmails: string[] = [];
    testWorker.processJob.mockImplementation((job) => {
      if (typeof job.data.email === 'string') {
        processedEmails.push(job.data.email);
      }
      return Promise.resolve();
    });

    bullmqWorker = new Worker(
      'test-e2e-outbox-queue',
      async (job: BullMQJob) => {
        await testWorker.process(job as Parameters<typeof testWorker.process>[0]);
      },
      { connection: testRedisOptions },
    );

    Object.defineProperty(testWorker, 'worker', {
      value: bullmqWorker,
      writable: true,
      configurable: true,
    });

    const pendingJob = outboxRepo.create({
      id: jobId,
      type: 'SEND_WELCOME_EMAIL',
      emitter: 'database-tests',
      target: 'test-e2e-outbox-queue',
      payload: { email: 'e2e-worker-success@example.com' },
      status: OutboxStatus.PENDING,
      attempts: 0,
      scheduledAt: new Date(Date.now() - 60_000),
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Partial<JobsOutboxModel>);
    await outboxRepo.save(pendingJob);

    const beforeRun = await outboxRepo.findOneByOrFail({ id: jobId });
    expect(beforeRun.status).toBe(OutboxStatus.PENDING);

    await harness.runCycle();

    await waitOutboxStatus(outboxRepo, [jobId], OutboxStatus.COMPLETED);

    const auditRecord = await waitForAuditStatus(jobId, JobAuditStatus.COMPLETED);

    expect(auditRecord).toBeDefined();
    expect(auditRecord.status).toBe(JobAuditStatus.COMPLETED);
    expect(auditRecord.jobType).toBe('SEND_WELCOME_EMAIL');
    expect(processedEmails).toContain('e2e-worker-success@example.com');

    await harness.stop();
  });

  it('should retry job when postgres goes down and succeed when it recovers', async () => {
    const jobId = '00000000-0000-0000-0000-000000000002';
    const testOutboxRepo = new TestJobsOutboxRepository(outboxRepo);
    const harness = new JobOutboxRunnerHarness(testOutboxRepo, redisClient);
    const testWorker = new TestWorker(auditRepo);

    let attempts = 0;
    const processedEmails: string[] = [];

    testWorker.processJob.mockImplementation((job) => {
      attempts++;
      if (attempts === 1) {
        throw new Error('Postgres connection timeout');
      }
      if (typeof job.data.email === 'string') {
        processedEmails.push(job.data.email);
      }
      return Promise.resolve();
    });

    const originalUpsert = auditRepo.upsert.bind(auditRepo);
    const originalUpdateWhere = auditRepo.updateWhere.bind(auditRepo);

    jest.spyOn(auditRepo, 'upsert').mockImplementation(async (data, conflictPaths) => {
      if (data.currentAttempt === 1) {
        throw new Error('DB connection lost');
      }
      return originalUpsert(data, conflictPaths);
    });

    jest.spyOn(auditRepo, 'updateWhere').mockImplementation(async (where, data) => {
      if (data.currentAttempt === 1) {
        throw new Error('DB connection lost');
      }
      return originalUpdateWhere(where, data);
    });

    bullmqWorker = new Worker(
      'test-e2e-outbox-queue',
      async (job: BullMQJob) => {
        await testWorker.process(job as Parameters<typeof testWorker.process>[0]);
      },
      { connection: testRedisOptions },
    );

    Object.defineProperty(testWorker, 'worker', {
      value: bullmqWorker,
      writable: true,
      configurable: true,
    });

    const pendingJob = outboxRepo.create({
      id: jobId,
      type: 'SEND_WELCOME_EMAIL',
      emitter: 'database-tests',
      target: 'test-e2e-outbox-queue',
      payload: { email: 'e2e-worker-retry@example.com' },
      status: OutboxStatus.PENDING,
      attempts: 0,
      scheduledAt: new Date(Date.now() - 60_000),
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Partial<JobsOutboxModel>);
    await outboxRepo.save(pendingJob);

    await harness.runCycle();
    await waitOutboxStatus(outboxRepo, [jobId], OutboxStatus.COMPLETED);

    const auditRecord = await waitForAuditStatus(jobId, JobAuditStatus.COMPLETED);

    expect(auditRecord).toBeDefined();
    expect(auditRecord.status).toBe(JobAuditStatus.COMPLETED);
    expect(auditRecord.currentAttempt).toBe(2);
    expect(processedEmails).toContain('e2e-worker-retry@example.com');

    await harness.stop();
  });

  it('should record audit failure when job processing fails permanently', async () => {
    const jobId = '00000000-0000-0000-0000-000000000003';
    const testOutboxRepo = new TestJobsOutboxRepository(outboxRepo);
    const harness = new JobOutboxRunnerHarness(testOutboxRepo, redisClient);
    const testWorker = new TestWorker(auditRepo);

    testWorker.processJob.mockImplementation(async () => {
      await Promise.reject(new Error('Business logic execution failed'));
    });

    bullmqWorker = new Worker(
      'test-e2e-outbox-queue',
      async (job: BullMQJob) => {
        await testWorker.process(job as Parameters<typeof testWorker.process>[0]);
      },
      { connection: testRedisOptions },
    );

    Object.defineProperty(testWorker, 'worker', {
      value: bullmqWorker,
      writable: true,
      configurable: true,
    });

    const pendingJob = outboxRepo.create({
      id: jobId,
      type: 'SEND_WELCOME_EMAIL',
      emitter: 'database-tests',
      target: 'test-e2e-outbox-queue',
      payload: { email: 'e2e-worker-fail@example.com' },
      status: OutboxStatus.PENDING,
      attempts: 0,
      scheduledAt: new Date(Date.now() - 60_000),
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Partial<JobsOutboxModel>);
    await outboxRepo.save(pendingJob);

    await harness.runCycle();
    await waitOutboxStatus(outboxRepo, [jobId], OutboxStatus.COMPLETED);

    const auditRecord = await waitForAuditStatus(jobId, JobAuditStatus.FAILED);

    expect(auditRecord).toBeDefined();
    expect(auditRecord.status).toBe(JobAuditStatus.FAILED);
    expect(auditRecord.errorMessage).toBe('Business logic execution failed');
    expect(auditRecord.errorStack).toContain('Business logic execution failed');

    await harness.stop();
  });

  it('should skip processing if job is already marked as COMPLETED in database', async () => {
    const jobId = '00000000-0000-0000-0000-000000000004';
    const testOutboxRepo = new TestJobsOutboxRepository(outboxRepo);
    const harness = new JobOutboxRunnerHarness(testOutboxRepo, redisClient);
    const testWorker = new TestWorker(auditRepo);

    const processedEmails: string[] = [];
    testWorker.processJob.mockImplementation((job) => {
      if (typeof job.data.email === 'string') {
        processedEmails.push(job.data.email);
      }
      return Promise.resolve();
    });

    const completedAudit = auditRepoModel.create({
      id: '10000000-0000-0000-0000-000000000004',
      jobId,
      jobType: 'SEND_WELCOME_EMAIL',
      status: JobAuditStatus.COMPLETED,
      workerId: 'previous-worker',
      currentAttempt: 1,
      startedAt: new Date(),
      finishedAt: new Date(),
    });
    await auditRepoModel.save(completedAudit);

    bullmqWorker = new Worker(
      'test-e2e-outbox-queue',
      async (job: BullMQJob) => {
        await testWorker.process(job as Parameters<typeof testWorker.process>[0]);
      },
      { connection: testRedisOptions },
    );

    Object.defineProperty(testWorker, 'worker', {
      value: bullmqWorker,
      writable: true,
      configurable: true,
    });

    const pendingJob = outboxRepo.create({
      id: jobId,
      type: 'SEND_WELCOME_EMAIL',
      emitter: 'database-tests',
      target: 'test-e2e-outbox-queue',
      payload: { email: 'e2e-worker-idempotent-db@example.com' },
      status: OutboxStatus.PENDING,
      attempts: 0,
      scheduledAt: new Date(Date.now() - 60_000),
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Partial<JobsOutboxModel>);
    await outboxRepo.save(pendingJob);

    await harness.runCycle();
    await waitOutboxStatus(outboxRepo, [jobId], OutboxStatus.COMPLETED);

    await new Promise((resolve) => setTimeout(resolve, 500));

    expect(processedEmails).not.toContain('e2e-worker-idempotent-db@example.com');

    const redisVal = await redisClient.get(`job:completed:${jobId}`);
    expect(redisVal).toBe('true');

    await harness.stop();
  });

  it('should skip processing if job is already marked as completed in Redis', async () => {
    const jobId = '00000000-0000-0000-0000-000000000005';
    const testOutboxRepo = new TestJobsOutboxRepository(outboxRepo);
    const harness = new JobOutboxRunnerHarness(testOutboxRepo, redisClient);
    const testWorker = new TestWorker(auditRepo);

    const processedEmails: string[] = [];
    testWorker.processJob.mockImplementation(async (job) => {
      if (typeof job.data.email === 'string') {
        processedEmails.push(job.data.email);
      }
      return Promise.resolve();
    });

    await redisClient.set(`job:completed:${jobId}`, 'true');

    bullmqWorker = new Worker(
      'test-e2e-outbox-queue',
      async (job: BullMQJob) => {
        await testWorker.process(job as Parameters<typeof testWorker.process>[0]);
      },
      { connection: testRedisOptions },
    );

    Object.defineProperty(testWorker, 'worker', {
      value: bullmqWorker,
      writable: true,
      configurable: true,
    });

    const pendingJob = outboxRepo.create({
      id: jobId,
      type: 'SEND_WELCOME_EMAIL',
      emitter: 'database-tests',
      target: 'test-e2e-outbox-queue',
      payload: { email: 'e2e-worker-idempotent-redis@example.com' },
      status: OutboxStatus.PENDING,
      attempts: 0,
      scheduledAt: new Date(Date.now() - 60_000),
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Partial<JobsOutboxModel>);
    await outboxRepo.save(pendingJob);

    await harness.runCycle();
    await waitOutboxStatus(outboxRepo, [jobId], OutboxStatus.COMPLETED);

    await new Promise((resolve) => setTimeout(resolve, 500));

    expect(processedEmails).not.toContain('e2e-worker-idempotent-redis@example.com');

    const dbRecord = await auditRepoModel.findOneBy({ jobId });
    expect(dbRecord).toBeNull();

    await harness.stop();
  });

  it('should process a job that fails on first attempt and succeeds on retry, updating audit correctly', async () => {
    const jobId = '00000000-0000-0000-0000-000000000006';
    const testOutboxRepo = new TestJobsOutboxRepository(outboxRepo);
    const harness = new JobOutboxRunnerHarness(testOutboxRepo, redisClient);
    const testWorker = new TestWorker(auditRepo);

    let attempts = 0;
    const processedEmails: string[] = [];

    testWorker.processJob.mockImplementation(async (job) => {
      attempts++;
      if (attempts === 1) {
        throw new Error('Temporary business logic error');
      }
      if (typeof job.data.email === 'string') {
        processedEmails.push(job.data.email);
      }
      return Promise.resolve();
    });

    bullmqWorker = new Worker(
      'test-e2e-outbox-queue',
      async (job: BullMQJob) => {
        await testWorker.process(job as Parameters<typeof testWorker.process>[0]);
      },
      { connection: testRedisOptions },
    );

    Object.defineProperty(testWorker, 'worker', {
      value: bullmqWorker,
      writable: true,
      configurable: true,
    });

    const pendingJob = outboxRepo.create({
      id: jobId,
      type: 'SEND_WELCOME_EMAIL',
      emitter: 'database-tests',
      target: 'test-e2e-outbox-queue',
      payload: { email: 'e2e-worker-retry-success@example.com' },
      status: OutboxStatus.PENDING,
      attempts: 0,
      scheduledAt: new Date(Date.now() - 60_000),
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Partial<JobsOutboxModel>);
    await outboxRepo.save(pendingJob);

    await harness.runCycle();

    const failedAudit = await waitForAuditStatus(jobId, JobAuditStatus.FAILED);
    expect(failedAudit).toBeDefined();
    expect(failedAudit.status).toBe(JobAuditStatus.FAILED);
    expect(failedAudit.currentAttempt).toBe(1);
    expect(failedAudit.errorMessage).toBe('Temporary business logic error');

    const completedAudit = await waitForAuditStatus(jobId, JobAuditStatus.COMPLETED);
    expect(completedAudit).toBeDefined();
    expect(completedAudit.status).toBe(JobAuditStatus.COMPLETED);
    expect(completedAudit.currentAttempt).toBe(2);
    expect(processedEmails).toContain('e2e-worker-retry-success@example.com');

    await harness.stop();
  }, 10000);
});
