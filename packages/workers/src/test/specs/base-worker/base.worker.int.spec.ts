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
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await clearTestRedis();
    jest.restoreAllMocks();
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
    it('devrait créer une seule row audit pour un job (idempotent sur COMPLETED)', async () => {
      // Test that subsequent calls don't create multiple rows, they upsert the same row
      // Arrange
      const jobId = 'int-single-row-001';
      const mockJob = makeTestJob({ id: jobId });
      const worker = new TestWorker(auditRepo);

      mockJob.attemptsMade = 0;
      worker.processJob.mockResolvedValue(undefined);

      // Act
      await worker.process(mockJob);

      // Assert
      const allAudits = await modelRepo.find({ where: { jobId } });
      expect(allAudits).toHaveLength(1);
      expect(allAudits[0].status).toBe(JobAuditStatus.COMPLETED);

      // If we were to retry, idempotence guard would skip processing
      mockJob.attemptsMade = 1;
      await worker.process(mockJob);

      // Should still be just 1 row
      const finalAudits = await modelRepo.find({ where: { jobId } });
      expect(finalAudits).toHaveLength(1);
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

  describe('Idempotence — Job déjà COMPLETED', () => {
    it('devrait ignorer processJob si statut COMPLETED', async () => {
      // Arrange
      const jobId = 'int-idempotent-001';
      const mockJob = makeTestJob({ id: jobId });
      const worker = new TestWorker(auditRepo);

      // 1re tentative: traite et complète
      mockJob.attemptsMade = 0;
      worker.processJob.mockResolvedValue(undefined);
      await worker.process(mockJob);

      let audit = await auditRepo.findByJobId(jobId);
      expect(audit?.status).toBe(JobAuditStatus.COMPLETED);

      // 2e tentative: job ID même, attemptsMade=1
      mockJob.attemptsMade = 1;
      worker.processJob.mockClear();

      // Act
      await worker.process(mockJob);

      // Assert
      expect(worker.processJob).not.toHaveBeenCalled();

      audit = await auditRepo.findByJobId(jobId);
      expect(audit?.status).toBe(JobAuditStatus.COMPLETED);

      // Vérifier une seule row
      const allAudits = await modelRepo.find({ where: { jobId } });
      expect(allAudits).toHaveLength(1);
    });

    it('devrait loger warning quand job déjà complété', async () => {
      // Arrange
      const jobId = 'int-idempotent-warn-001';
      const mockJob = makeTestJob({ id: jobId });
      const worker = new TestWorker(auditRepo);

      mockJob.attemptsMade = 0;
      worker.processJob.mockResolvedValue(undefined);
      await worker.process(mockJob);

      mockJob.attemptsMade = 1;
      worker.logger.warn.mockClear();

      // Act
      await worker.process(mockJob);

      // Assert
      expect(worker.logger.warn).toHaveBeenCalledWith('Job already processed, skipping', {
        jobId,
        type: mockJob.name,
      });
    });
  });

  describe('Audit failure resilience', () => {
    it('devrait rejeter si updateWhere échoue après succès', async () => {
      // Arrange
      const jobId = 'int-audit-fail-success-001';
      const mockJob = makeTestJob({ id: jobId });

      // Créer un mock auditRepo qui échoue sur COMPLETED update
      const mockAuditRepo = {
        findByJobId: jest.fn().mockResolvedValue(null),
        upsert: jest.fn().mockResolvedValue({ jobId, status: JobAuditStatus.PROCESSING }),
        updateWhere: jest
          .fn()
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .mockImplementation((_where: any, data: any) => {
            if (data?.status === JobAuditStatus.COMPLETED) {
              throw new Error('Simulated DB failure on COMPLETED update');
            }
            return Promise.resolve(undefined);
          }),
      };

      const worker = new TestWorker(mockAuditRepo as unknown as JobAuditRepository);
      mockJob.attemptsMade = 0;
      worker.processJob.mockResolvedValue(undefined);

      // Act & Assert
      await expect(worker.process(mockJob)).rejects.toThrow(
        'Simulated DB failure on COMPLETED update',
      );

      // Vérifier que upsert a été appelé
      expect(mockAuditRepo.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          status: JobAuditStatus.PROCESSING,
        }),
        ['jobId'],
      );

      // Vérifier que updateWhere a été appelé et a échoué
      expect(mockAuditRepo.updateWhere).toHaveBeenCalledWith(
        { jobId },
        expect.objectContaining({ status: JobAuditStatus.COMPLETED }),
      );

      // processJob avait bien été appelé
      expect(worker.processJob).toHaveBeenCalledTimes(1);
    });

    it('devrait rejeter si updateWhere échoue lors de failure', async () => {
      // Arrange
      const jobId = 'int-audit-fail-failure-001';
      const mockJob = makeTestJob({ id: jobId });
      const jobError = new Error('Job processing failed');

      // Créer un mock auditRepo qui échoue sur FAILED update
      const mockAuditRepo = {
        findByJobId: jest.fn().mockResolvedValue(null),
        upsert: jest.fn().mockResolvedValue({ jobId, status: JobAuditStatus.PROCESSING }),
        updateWhere: jest
          .fn()
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .mockImplementation((_where: any, data: any) => {
            if (data?.status === JobAuditStatus.FAILED) {
              throw new Error('Simulated DB failure on FAILED update');
            }
            return Promise.resolve(undefined);
          }),
      };

      const worker = new TestWorker(mockAuditRepo as unknown as JobAuditRepository);
      mockJob.attemptsMade = 0;
      worker.processJob.mockRejectedValue(jobError);

      // Act & Assert
      const thrown = await worker.process(mockJob).catch((error: unknown) => error);
      expect(thrown instanceof Error && thrown.message).toBe(
        'Simulated DB failure on FAILED update',
      );

      // Vérifier que upsert a été appelé
      expect(mockAuditRepo.upsert).toHaveBeenCalled();

      // Vérifier que updateWhere a été appelé et a échoué
      expect(mockAuditRepo.updateWhere).toHaveBeenCalledWith(
        { jobId },
        expect.objectContaining({ status: JobAuditStatus.FAILED }),
      );

      // processJob avait bien été appelé
      expect(worker.processJob).toHaveBeenCalledTimes(1);
    });
  });

  describe('Type de Job Invalide', () => {
    it("devrait traiter un job de type différent sans corrompre l'audit", async () => {
      // Arrange
      const jobId = 'int-wrong-type-001';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
      const wrongTypeJob = makeTestJob({ id: jobId, name: 'DIFFERENT_JOB_TYPE' as any });
      const worker = new TestWorker(auditRepo);

      wrongTypeJob.attemptsMade = 0;
      worker.processJob.mockResolvedValue(undefined);

      // Act
      await worker.process(wrongTypeJob);

      // Assert
      const audit = await auditRepo.findByJobId(jobId);
      expect(audit).not.toBeNull();
      if (!audit) return;

      expect(audit.status).toBe(JobAuditStatus.COMPLETED);
      expect(audit.jobType).toBe('DIFFERENT_JOB_TYPE');
      expect(worker.processJob).toHaveBeenCalledTimes(1);
    });
  });
});
