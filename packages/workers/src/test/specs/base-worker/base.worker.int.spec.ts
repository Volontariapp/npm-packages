import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import type { Repository } from 'typeorm';
import { databaseMapper } from '@volontariapp/database';
import { testDataSource, initializeTestDb, closeTestDb } from '../../data-source.js';
import { clearTestDatabase, clearTestRedis } from '../../utils/index.js';
import { JobAuditModel } from '../../../data/models/job-audit.model.js';
import { JobAuditEntity } from '../../../data/entities/job-audit.entity.js';
import { JobAuditStatus } from '../../../data/types/job-audit.status.js';
import { JobAuditRepository } from '../../../data/repositories/job-audit.repository.js';
import { TestWorker, makeTestJob } from '../../utils/index.js';

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
  });

  afterEach(async () => {
    await clearTestRedis();
  });

  describe('Succès — PROCESSING → COMPLETED', () => {
    it('devrait enregistrer audit avec statut COMPLETED', async () => {
      // Arrange
      const jobId = 'int-success-001';
      const mockJob = makeTestJob({ id: jobId });
      const worker = new TestWorker(auditRepo);

      mockJob.attemptsMade = 0;
      worker.processJob.mockResolvedValue(undefined);

      // Act
      await worker.process(mockJob);

      // Assert
      const audit = await auditRepo.findByJobId(jobId);
      expect(audit).not.toBeNull();
      if (!audit) return;

      expect(audit.status).toBe(JobAuditStatus.COMPLETED);
      expect(audit.startedAt).toBeDefined();
      expect(audit.finishedAt).toBeDefined();
      if (audit.startedAt && audit.finishedAt) {
        expect(audit.startedAt.getTime()).toBeLessThanOrEqual(audit.finishedAt.getTime());
      }
    });

    it('devrait enregistrer jobType et workerId', async () => {
      // Arrange
      const jobId = 'int-meta-001';
      const mockJob = makeTestJob({ id: jobId });
      const worker = new TestWorker(auditRepo);

      mockJob.attemptsMade = 0;
      worker.processJob.mockResolvedValue(undefined);

      // Act
      await worker.process(mockJob);

      // Assert
      const audit = await auditRepo.findByJobId(jobId);
      expect(audit).not.toBeNull();
      if (!audit) return;

      expect(audit.jobType).toBe(mockJob.name);
      expect(audit.workerId).toBeDefined();
      expect(typeof audit.workerId).toBe('string');
      expect(audit.currentAttempt).toBe(1);
    });
  });

  describe('Échec — PROCESSING → FAILED', () => {
    it('devrait enregistrer error_message et error_stack', async () => {
      // Arrange
      const jobId = 'int-fail-001';
      const mockJob = makeTestJob({ id: jobId });
      const worker = new TestWorker(auditRepo);
      const error = new Error('Processing failed');

      mockJob.attemptsMade = 0;
      worker.processJob.mockRejectedValue(error);

      // Act & Assert
      await expect(worker.process(mockJob)).rejects.toThrow(error);

      const audit = await auditRepo.findByJobId(jobId);
      expect(audit).not.toBeNull();
      if (!audit) return;

      expect(audit.status).toBe(JobAuditStatus.FAILED);
      expect(audit.errorMessage).toBe('Processing failed');
      expect(audit.errorStack).toContain('Error: Processing failed');
      expect(audit.finishedAt).toBeDefined();
    });

    it('devrait gérer non-Error thrown values', async () => {
      // Arrange
      const jobId = 'int-fail-string-001';
      const mockJob = makeTestJob({ id: jobId });
      const worker = new TestWorker(auditRepo);

      mockJob.attemptsMade = 0;
      worker.processJob.mockRejectedValue('string-error');

      // Act & Assert
      await expect(worker.process(mockJob)).rejects.toBe('string-error');

      const audit = await auditRepo.findByJobId(jobId);
      expect(audit).not.toBeNull();
      if (!audit) return;

      expect(audit.status).toBe(JobAuditStatus.FAILED);
      expect(audit.errorMessage).toBe('string-error');
      expect(audit.errorStack).toBeNull();
    });
  });

  describe('Retry — Upsert & Increment', () => {
    it('devrait incrémenter currentAttempt sur 2e tentative', async () => {
      // Arrange
      const jobId = 'int-retry-001';
      const mockJob = makeTestJob({ id: jobId });
      const worker = new TestWorker(auditRepo);

      // 1re tentative
      mockJob.attemptsMade = 0;
      worker.processJob.mockResolvedValue(undefined);
      await worker.process(mockJob);

      let audit = await auditRepo.findByJobId(jobId);
      expect(audit).not.toBeNull();
      if (!audit) return;
      expect(audit.currentAttempt).toBe(1);

      // 2e tentative
      mockJob.attemptsMade = 1;
      await worker.process(mockJob);

      // Assert
      audit = await auditRepo.findByJobId(jobId);
      expect(audit).not.toBeNull();
      if (!audit) return;
      expect(audit.currentAttempt).toBe(2);
      expect(audit.status).toBe(JobAuditStatus.COMPLETED);
    });

    it('devrait faire upsert sur retry (une seule row en DB)', async () => {
      // Arrange
      const jobId = 'int-upsert-001';
      const mockJob = makeTestJob({ id: jobId });
      const worker = new TestWorker(auditRepo);

      // 1re tentative
      mockJob.attemptsMade = 0;
      worker.processJob.mockResolvedValue(undefined);
      await worker.process(mockJob);

      // 2e tentative
      mockJob.attemptsMade = 1;
      await worker.process(mockJob);

      // Assert — une seule ligne
      const allAudits = await modelRepo.find({ where: { jobId } });
      expect(allAudits).toHaveLength(1);
      expect(allAudits[0].currentAttempt).toBe(2);
    });
  });

  describe('Graceful Degradation', () => {
    it('devrait fonctionner sans auditRepo', async () => {
      // Arrange
      const jobId = 'int-no-audit-001';
      const mockJob = makeTestJob({ id: jobId });
      const worker = new TestWorker(); // sans auditRepo

      mockJob.attemptsMade = 0;
      worker.processJob.mockResolvedValue(undefined);

      // Act & Assert
      await expect(worker.process(mockJob)).resolves.toBeUndefined();

      // Vérifier qu'aucun audit n'a été créé
      const allAudits = await modelRepo.find({ where: { jobId } });
      expect(allAudits).toHaveLength(0);
    });
  });

  describe('Timestamp Consistency', () => {
    it('devrait avoir timestamps cohérents', async () => {
      // Arrange
      const jobId = 'int-ts-001';
      const mockJob = makeTestJob({ id: jobId });
      const worker = new TestWorker(auditRepo);
      const beforeStart = new Date();

      mockJob.attemptsMade = 0;
      worker.processJob.mockResolvedValue(undefined);

      // Act
      await worker.process(mockJob);
      const afterEnd = new Date();

      // Assert
      const audit = await auditRepo.findByJobId(jobId);
      expect(audit).not.toBeNull();
      if (!audit) return;

      expect(audit.startedAt).toBeDefined();
      expect(audit.finishedAt).toBeDefined();
      if (audit.startedAt && audit.finishedAt) {
        expect(audit.startedAt.getTime()).toBeGreaterThanOrEqual(beforeStart.getTime());
        expect(audit.finishedAt.getTime()).toBeLessThanOrEqual(afterEnd.getTime());
        expect(audit.startedAt.getTime()).toBeLessThanOrEqual(audit.finishedAt.getTime());
      }
    });
  });
});
