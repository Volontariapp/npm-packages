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
import type { Repository, UpdateResult } from 'typeorm';
import { Queue } from 'bullmq';
import { databaseMapper } from '@volontariapp/database';
import { createMock } from '@volontariapp/testing';
import { testDataSource, initializeTestDb, closeTestDb } from '../../data-source.js';
import { clearTestDatabase, clearTestRedis } from '../../utils/index.js';
import { JobAuditModel } from '../../../data/models/job-audit.model.js';
import { JobAuditEntity } from '../../../data/entities/job-audit.entity.js';
import { JobAuditStatus } from '../../../data/types/job-audit.status.js';
import { JobAuditRepository } from '../../../data/repositories/job-audit.repository.js';
import { TestWorker } from '../../utils/index.js';
import type { TestJob } from '../../utils/index.js';
import { testRedisOptions } from '../../redis-config.js';
import {
  getFirstJob,
  processJob,
  processJobExpectError,
  type TestJobPayload,
} from './base.worker.int.helper.js';

describe('BaseWorker — Integration', () => {
  let modelRepo: Repository<JobAuditModel>;
  let auditRepo: JobAuditRepository;

  beforeAll(async () => {
    databaseMapper.registerBidirectional(JobAuditModel, JobAuditEntity);
    await initializeTestDb();
    modelRepo = testDataSource.getRepository(JobAuditModel);
    auditRepo = new JobAuditRepository(modelRepo);
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await clearTestDatabase(modelRepo);
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await clearTestRedis();
    jest.restoreAllMocks();
  });

  describe('Succès — PROCESSING → COMPLETED (Redis)', () => {
    it('enregistre audit COMPLETED avec timestamps depuis Redis', async () => {
      const jobId = 'int-redis-success-001';
      const queue = new Queue<TestJobPayload, void, string>('test-success-queue', {
        connection: testRedisOptions,
      });
      const worker = new TestWorker(auditRepo);
      worker.processJob.mockResolvedValue(undefined);

      try {
        // Push réel dans Redis
        await queue.add('SEND_WELCOME_EMAIL', { email: 'test@example.com' }, { jobId });
        const jobs = await queue.getJobs(['waiting']);

        const job = getFirstJob(jobs);

        job.attemptsMade = 0;

        const beforeProcess = new Date();
        await processJob(worker, job);
        const afterProcess = new Date();

        // Vérifier audit en DB réelle
        const audit = await auditRepo.findByJobId(jobId);
        expect(audit).not.toBeNull();
        if (audit) {
          expect(audit.status).toBe(JobAuditStatus.COMPLETED);
          expect(audit.startedAt).toBeDefined();
          expect(audit.finishedAt).toBeDefined();
          if (audit.startedAt && audit.finishedAt) {
            expect(audit.startedAt.getTime()).toBeGreaterThanOrEqual(beforeProcess.getTime());
            expect(audit.finishedAt.getTime()).toBeLessThanOrEqual(afterProcess.getTime());
            expect(audit.startedAt.getTime()).toBeLessThanOrEqual(audit.finishedAt.getTime());
          }
        }
      } finally {
        await queue.close();
      }
    });

    it('enregistre jobType, workerId, currentAttempt depuis Redis', async () => {
      const jobId = 'int-redis-meta-001';
      const queue = new Queue<TestJobPayload, void, string>('test-meta-queue', {
        connection: testRedisOptions,
      });
      const worker = new TestWorker(auditRepo);
      worker.processJob.mockResolvedValue(undefined);

      try {
        // Test 1: First attempt (attemptsMade=0)
        await queue.add('SEND_WELCOME_EMAIL', { email: 'user@test.com' }, { jobId });
        const jobs = await queue.getJobs(['waiting']);
        expect(jobs).toHaveLength(1);

        const job = jobs[0];
        job.attemptsMade = 0;

        await processJob(worker, job);

        const audit = await auditRepo.findByJobId(jobId);
        expect(audit).not.toBeNull();
        if (audit) {
          expect(audit.jobType).toBe('SEND_WELCOME_EMAIL');
          expect(audit.workerId).toBeDefined();
          expect(typeof audit.workerId).toBe('string');
          expect(audit.currentAttempt).toBe(1); // attemptsMade=0 → attempt 1
        }
      } finally {
        await queue.close();
      }
    });
  });

  describe('Échec — PROCESSING → FAILED (Redis)', () => {
    it('enregistre error_message et error_stack depuis Redis', async () => {
      const jobId = 'int-redis-fail-001';
      const queue = new Queue<TestJobPayload, void, string>('test-fail-queue', {
        connection: testRedisOptions,
      });
      const worker = new TestWorker(auditRepo);
      const jobError = new Error('Redis job processing error');
      worker.processJob.mockRejectedValue(jobError);

      try {
        await queue.add('SEND_WELCOME_EMAIL', {}, { jobId });
        const jobs = await queue.getJobs(['waiting']);

        const job = jobs[0];
        job.attemptsMade = 0;

        await processJobExpectError(worker, job, jobError);

        const audit = await auditRepo.findByJobId(jobId);
        expect(audit).not.toBeNull();
        if (audit) {
          expect(audit.status).toBe(JobAuditStatus.FAILED);
          expect(audit.errorMessage).toBe('Redis job processing error');
          expect(audit.errorStack).toContain('Error: Redis job processing error');
          expect(audit.finishedAt).toBeDefined();
        }
      } finally {
        await queue.close();
      }
    });

    it('gère string-error (non-Error thrown) depuis Redis', async () => {
      const jobId = 'int-redis-fail-string-001';
      const queue = new Queue<TestJobPayload, void, string>('test-fail-string-queue', {
        connection: testRedisOptions,
      });
      const worker = new TestWorker(auditRepo);

      worker.processJob.mockRejectedValue('custom-error-string');

      try {
        await queue.add('SEND_WELCOME_EMAIL', {}, { jobId });
        const jobs = await queue.getJobs(['waiting']);

        const job = jobs[0];
        job.attemptsMade = 0;

        await expect(processJob(worker, job)).rejects.toBe('custom-error-string');

        const audit = await auditRepo.findByJobId(jobId);
        expect(audit).not.toBeNull();
        if (audit) {
          expect(audit.status).toBe(JobAuditStatus.FAILED);
          expect(audit.errorMessage).toBe('custom-error-string');
          expect(audit.errorStack).toBeNull();
        }
      } finally {
        await queue.close();
      }
    });

    it('enregistre error lors de audit failure (DB failure)', async () => {
      const jobId = 'int-redis-audit-fail-001';
      const queue = new Queue<TestJobPayload, void, string>('test-audit-fail-queue', {
        connection: testRedisOptions,
      });

      const mockAuditRepo = createMock<JobAuditRepository>();
      mockAuditRepo.findByJobId.mockResolvedValue(null);
      mockAuditRepo.upsert.mockResolvedValue({
        jobId,
        status: JobAuditStatus.PROCESSING,
      } as JobAuditEntity);
      mockAuditRepo.updateWhere.mockRejectedValue(new Error('DB connection lost'));

      const worker = new TestWorker(mockAuditRepo);
      const jobError = new Error('Job processing failed');
      worker.processJob.mockRejectedValue(jobError);

      const upsertSpy = jest.spyOn(mockAuditRepo, 'upsert');
      const updateWhereSpy = jest.spyOn(mockAuditRepo, 'updateWhere');

      try {
        await queue.add('SEND_WELCOME_EMAIL', {}, { jobId });
        const jobs = await queue.getJobs(['waiting']);

        const job = getFirstJob(jobs);

        job.attemptsMade = 0;

        await expect(processJob(worker, job)).rejects.toThrow('DB connection lost');

        expect(upsertSpy).toHaveBeenCalled();
        expect(updateWhereSpy).toHaveBeenCalled();
      } finally {
        await queue.close();
      }
    });
  });

  describe('Retry — Upsert & Increment (Redis)', () => {
    it('crée une seule row audit (Redis idempotent COMPLETED)', async () => {
      const jobId = 'int-redis-single-row-001';
      const queue = new Queue<TestJobPayload, void, string>('test-single-row-queue', {
        connection: testRedisOptions,
      });
      const worker = new TestWorker(auditRepo);
      worker.processJob.mockResolvedValue(undefined);
      const processJobSpy = jest.spyOn(worker, 'processJob');

      try {
        // 1re tentative
        await queue.add('SEND_WELCOME_EMAIL', {}, { jobId });
        let jobs = await queue.getJobs(['waiting']);

        let job = jobs[0];
        job.attemptsMade = 0;

        await processJob(worker, job);

        const allAudits = await modelRepo.find({ where: { jobId } });
        expect(allAudits).toHaveLength(1);
        expect(allAudits[0].status).toBe(JobAuditStatus.COMPLETED);

        // 2e tentative: Redis job avec même jobId
        processJobSpy.mockClear();
        await queue.add('SEND_WELCOME_EMAIL', {}, { jobId });
        jobs = await queue.getJobs(['waiting']);
        job = getFirstJob(jobs);
        job.attemptsMade = 1;

        await processJob(worker, job);

        // Idempotence: toujours 1 seule row
        const finalAudits = await modelRepo.find({ where: { jobId } });
        expect(finalAudits).toHaveLength(1);
        expect(finalAudits[0].status).toBe(JobAuditStatus.COMPLETED);
        expect(processJobSpy).not.toHaveBeenCalled(); // Guard skipped re-processing
      } finally {
        await queue.close();
      }
    });

    it('incrémente currentAttempt basé sur job.attemptsMade depuis Redis', async () => {
      const jobId = 'int-redis-attempt-increment-001';
      const queue = new Queue<TestJobPayload, void, string>('test-attempt-queue', {
        connection: testRedisOptions,
      });
      const worker = new TestWorker(auditRepo);

      worker.processJob.mockResolvedValue(undefined);
      const processJobSpy = jest.spyOn(worker, 'processJob');

      try {
        // Simulate job with multiple attempts
        // Attempt 1 (attemptsMade=0)
        await queue.add('SEND_WELCOME_EMAIL', {}, { jobId });
        let jobs = await queue.getJobs(['waiting']);

        let job = jobs[0];
        job.attemptsMade = 0;

        await processJob(worker, job);

        let audit = await auditRepo.findByJobId(jobId);
        expect(audit?.currentAttempt).toBe(1); // attemptsMade=0 → attempt 1
        expect(audit?.status).toBe(JobAuditStatus.COMPLETED);

        // Attempt 2 (attemptsMade=1, same jobId mais depuis Redis)
        // On simule que le job a été retried
        processJobSpy.mockClear();
        await queue.add('SEND_WELCOME_EMAIL', {}, { jobId });
        jobs = await queue.getJobs(['waiting']);
        job = getFirstJob(jobs);
        job.attemptsMade = 1;

        // Guard: job déjà COMPLETED donc pas de retraitement
        await processJob(worker, job);

        audit = await auditRepo.findByJobId(jobId);
        // Audit doit toujours montrer l'attempt 1 car idempotence guard skipped le retraitement
        expect(audit?.currentAttempt).toBe(1);
        expect(audit?.status).toBe(JobAuditStatus.COMPLETED);
        expect(processJobSpy).not.toHaveBeenCalled(); // Guard prevented reprocessing
      } finally {
        await queue.close();
      }
    });
  });

  describe('Graceful Degradation', () => {
    it("fonctionne sans auditRepo (pas d'audit créé)", async () => {
      const jobId = 'int-redis-no-audit-001';
      const queue = new Queue<TestJobPayload, void, string>('test-no-audit-queue', {
        connection: testRedisOptions,
      });
      const worker = new TestWorker(); // Sans auditRepo

      worker.processJob.mockResolvedValue(undefined);
      const processJobSpy = jest.spyOn(worker, 'processJob');

      try {
        await queue.add('SEND_WELCOME_EMAIL', {}, { jobId });
        const jobs = await queue.getJobs(['waiting']);

        const job = jobs[0];
        job.attemptsMade = 0;

        await expect(worker.process(job as TestJob)).resolves.toBeUndefined();

        // Aucun audit créé sans repo
        const allAudits = await modelRepo.find({ where: { jobId } });
        expect(allAudits).toHaveLength(0);
        expect(processJobSpy).toHaveBeenCalledTimes(1);
      } finally {
        await queue.close();
      }
    });

    it('fonctionne sans job.id (graceful skip)', async () => {
      const jobId = 'int-redis-no-id-001';
      const queue = new Queue<TestJobPayload, void, string>('test-no-id-queue', {
        connection: testRedisOptions,
      });
      const worker = new TestWorker(auditRepo);

      worker.processJob.mockResolvedValue(undefined);
      const processJobSpy = jest.spyOn(worker, 'processJob');

      try {
        await queue.add('SEND_WELCOME_EMAIL', {}, { jobId });
        const jobs = await queue.getJobs(['waiting']);

        const job = jobs[0];
        job.attemptsMade = 0;
        job.id = undefined; // Simulate missing ID

        await expect(worker.process(job as TestJob)).resolves.toBeUndefined();

        // Pas d'audit créé sans ID
        const allAudits = await modelRepo.find({ where: { jobId } });
        expect(allAudits).toHaveLength(0);
        expect(processJobSpy).toHaveBeenCalledTimes(1);
      } finally {
        await queue.close();
      }
    });
  });

  describe('Timestamp Consistency (Redis)', () => {
    it('timestamps cohérents depuis Redis', async () => {
      const jobId = 'int-redis-ts-001';
      const queue = new Queue<TestJobPayload, void, string>('test-ts-queue', {
        connection: testRedisOptions,
      });
      const worker = new TestWorker(auditRepo);

      worker.processJob.mockResolvedValue(undefined);

      try {
        const beforeStart = new Date();
        await queue.add('SEND_WELCOME_EMAIL', {}, { jobId });
        const jobs = await queue.getJobs(['waiting']);

        const job = jobs[0];
        job.attemptsMade = 0;

        await processJob(worker, job);
        const afterEnd = new Date();

        const audit = await auditRepo.findByJobId(jobId);
        expect(audit).not.toBeNull();
        if (audit) {
          expect(audit.startedAt).toBeDefined();
          expect(audit.finishedAt).toBeDefined();
          if (audit.startedAt && audit.finishedAt) {
            expect(audit.startedAt.getTime()).toBeGreaterThanOrEqual(beforeStart.getTime());
            expect(audit.finishedAt.getTime()).toBeLessThanOrEqual(afterEnd.getTime());
            expect(audit.startedAt.getTime()).toBeLessThanOrEqual(audit.finishedAt.getTime());
          }
        }
      } finally {
        await queue.close();
      }
    });
  });

  describe('Idempotence — Job déjà COMPLETED (Redis)', () => {
    it('ignore processJob si statut COMPLETED depuis Redis', async () => {
      const jobId = 'int-redis-idempotent-001';
      const queue = new Queue<TestJobPayload, void, string>('test-idempotent-queue', {
        connection: testRedisOptions,
      });
      const worker = new TestWorker(auditRepo);

      worker.processJob.mockResolvedValue(undefined);
      const processJobSpy = jest.spyOn(worker, 'processJob');

      try {
        // 1re tentative
        await queue.add('SEND_WELCOME_EMAIL', {}, { jobId });
        let jobs = await queue.getJobs(['waiting']);

        let job = jobs[0];
        job.attemptsMade = 0;

        await processJob(worker, job);

        let audit = await auditRepo.findByJobId(jobId);
        expect(audit?.status).toBe(JobAuditStatus.COMPLETED);

        // 2e tentative: même job ID depuis Redis
        processJobSpy.mockClear();
        await queue.add('SEND_WELCOME_EMAIL', {}, { jobId });
        jobs = await queue.getJobs(['waiting']);
        job = getFirstJob(jobs);
        job.attemptsMade = 1;

        await processJob(worker, job);

        // Guard doit skip processJob
        expect(processJobSpy).not.toHaveBeenCalled();

        audit = await auditRepo.findByJobId(jobId);
        expect(audit?.status).toBe(JobAuditStatus.COMPLETED);

        // Une seule audit row
        const allAudits = await modelRepo.find({ where: { jobId } });
        expect(allAudits).toHaveLength(1);
      } finally {
        await queue.close();
      }
    });

    it('log warning quand job déjà complété depuis Redis', async () => {
      const jobId = 'int-redis-idempotent-warn-001';
      const queue = new Queue<TestJobPayload, void, string>('test-idempotent-warn-queue', {
        connection: testRedisOptions,
      });
      const worker = new TestWorker(auditRepo);

      worker.processJob.mockResolvedValue(undefined);
      const warnSpy = jest.spyOn(worker.logger, 'warn');

      try {
        // 1re tentative
        await queue.add('SEND_WELCOME_EMAIL', {}, { jobId });
        let jobs = await queue.getJobs(['waiting']);

        let job = jobs[0];
        job.attemptsMade = 0;

        await processJob(worker, job);

        // 2e tentative
        warnSpy.mockClear();
        await queue.add('SEND_WELCOME_EMAIL', {}, { jobId });
        jobs = await queue.getJobs(['waiting']);
        job = getFirstJob(jobs);
        job.attemptsMade = 1;

        await processJob(worker, job);

        // Doit logger warning

        expect(warnSpy).toHaveBeenCalledWith('Job already processed, skipping', {
          jobId,
          type: 'SEND_WELCOME_EMAIL',
        });
      } finally {
        await queue.close();
      }
    });
  });

  describe('Audit failure resilience (Redis)', () => {
    it('rejette si updateWhere échoue après succès depuis Redis', async () => {
      const jobId = 'int-redis-audit-fail-success-001';
      const queue = new Queue<TestJobPayload, void, string>('test-audit-fail-success-queue', {
        connection: testRedisOptions,
      });

      // Mock auditRepo qui échoue sur COMPLETED update
      const mockAuditRepo = createMock<JobAuditRepository>();
      mockAuditRepo.findByJobId.mockResolvedValue(null);
      mockAuditRepo.upsert.mockResolvedValue({
        jobId,
        status: JobAuditStatus.PROCESSING,
      } as JobAuditEntity);
      mockAuditRepo.updateWhere.mockImplementation((_where, data) => {
        if (data.status === JobAuditStatus.COMPLETED) {
          throw new Error('DB failure on COMPLETED update');
        }
        return Promise.resolve({} as UpdateResult);
      });

      const worker = new TestWorker(mockAuditRepo);
      worker.processJob.mockResolvedValue(undefined);
      const upsertSpy = jest.spyOn(mockAuditRepo, 'upsert');
      const updateWhereSpy = jest.spyOn(mockAuditRepo, 'updateWhere');
      const processJobSpy = jest.spyOn(worker, 'processJob');

      try {
        await queue.add('SEND_WELCOME_EMAIL', {}, { jobId });
        const jobs = await queue.getJobs(['waiting']);

        const job = jobs[0];
        job.attemptsMade = 0;

        await expect(worker.process(job as TestJob)).rejects.toThrow(
          'DB failure on COMPLETED update',
        );

        // Vérifier que upsert a été appelé
        expect(upsertSpy).toHaveBeenCalled();

        // Vérifier que updateWhere a été appelé et a échoué
        expect(updateWhereSpy).toHaveBeenCalled();

        // processJob avait bien été appelé avant l'erreur d'audit
        expect(processJobSpy).toHaveBeenCalledTimes(1);
      } finally {
        await queue.close();
      }
    });

    it('rejette si updateWhere échoue lors de failure depuis Redis', async () => {
      const jobId = 'int-redis-audit-fail-failure-001';
      const queue = new Queue<TestJobPayload, void, string>('test-audit-fail-failure-queue', {
        connection: testRedisOptions,
      });
      const jobError = new Error('Job processing failed');

      // Mock auditRepo qui échoue sur FAILED update
      const mockAuditRepo = createMock<JobAuditRepository>();
      mockAuditRepo.findByJobId.mockResolvedValue(null);
      mockAuditRepo.upsert.mockResolvedValue({
        jobId,
        status: JobAuditStatus.PROCESSING,
      } as JobAuditEntity);
      mockAuditRepo.updateWhere.mockImplementation((_where, data) => {
        if (data.status === JobAuditStatus.FAILED) {
          throw new Error('DB failure on FAILED update');
        }
        return Promise.resolve({} as UpdateResult);
      });

      const worker = new TestWorker(mockAuditRepo);
      worker.processJob.mockRejectedValue(jobError);
      const upsertSpy = jest.spyOn(mockAuditRepo, 'upsert');
      const updateWhereSpy = jest.spyOn(mockAuditRepo, 'updateWhere');
      const processJobSpy = jest.spyOn(worker, 'processJob');

      try {
        await queue.add('SEND_WELCOME_EMAIL', {}, { jobId });
        const jobs = await queue.getJobs(['waiting']);

        const job = jobs[0];
        job.attemptsMade = 0;

        let thrown: Error | undefined;
        try {
          await worker.process(job as TestJob);
        } catch (error) {
          thrown = error as Error;
        }
        expect(thrown instanceof Error && thrown.message).toBe('DB failure on FAILED update');

        // Vérifier que upsert a été appelé
        expect(upsertSpy).toHaveBeenCalled();

        // Vérifier que updateWhere a été appelé et a échoué
        expect(updateWhereSpy).toHaveBeenCalled();

        // processJob avait bien été appelé
        expect(processJobSpy).toHaveBeenCalledTimes(1);
      } finally {
        await queue.close();
      }
    });
  });

  describe('Type de Job Invalide (Redis)', () => {
    it("traite job de type différent sans corrompre l'audit depuis Redis", async () => {
      const jobId = 'int-redis-wrong-type-001';
      const queue = new Queue<TestJobPayload, void, string>('test-wrong-type-queue', {
        connection: testRedisOptions,
      });
      const worker = new TestWorker(auditRepo);

      worker.processJob.mockResolvedValue(undefined);
      const processJobSpy = jest.spyOn(worker, 'processJob');

      try {
        // Job avec name DIFFERENT_JOB_TYPE
        await queue.add('DIFFERENT_JOB_TYPE', {}, { jobId });
        const jobs = await queue.getJobs(['waiting']);

        const job = jobs[0];
        job.attemptsMade = 0;

        await processJob(worker, job);

        const audit = await auditRepo.findByJobId(jobId);
        expect(audit).not.toBeNull();
        if (audit) {
          expect(audit.status).toBe(JobAuditStatus.COMPLETED);
          expect(audit.jobType).toBe('DIFFERENT_JOB_TYPE');
        }

        expect(processJobSpy).toHaveBeenCalledTimes(1);
      } finally {
        await queue.close();
      }
    });
  });
});
