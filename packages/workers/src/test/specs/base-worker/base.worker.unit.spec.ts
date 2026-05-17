import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { JobMessagingType } from '@volontariapp/messaging';
import type { Logger } from '@volontariapp/logger';
import {
  TestWorker,
  makeTestJob,
  type TestJob,
  createAuditRepositoryMock,
} from '../../utils/index.js';
import { JobAuditStatus } from '../../../data/types/job-audit.status.js';
import type { JobAuditEntity } from '../../../data/entities/job-audit.entity.js';
import type { JobAuditRepository } from '../../../data/repositories/job-audit.repository.js';

describe('BaseWorker', () => {
  let worker: TestWorker;
  let mockJob: TestJob;
  let processJobSpy: jest.SpiedFunction<TestWorker['processJob']>;
  let loggerInfoSpy: jest.SpiedFunction<Logger['info']>;
  let loggerErrorSpy: jest.SpiedFunction<Logger['error']>;
  let loggerWarnSpy: jest.SpiedFunction<Logger['warn']>;

  beforeEach(() => {
    jest.clearAllMocks();
    worker = new TestWorker();
    mockJob = makeTestJob();
    processJobSpy = jest.spyOn(worker, 'processJob');
    loggerInfoSpy = jest.spyOn(worker.logger, 'info');
    loggerErrorSpy = jest.spyOn(worker.logger, 'error');
    loggerWarnSpy = jest.spyOn(worker.logger, 'warn');
  });

  describe('process — success', () => {
    it('should call processJob with the job', async () => {
      processJobSpy.mockResolvedValue(undefined);

      await worker.process(mockJob);

      expect(processJobSpy).toHaveBeenCalledTimes(1);
      expect(processJobSpy).toHaveBeenCalledWith(mockJob);
    });

    it('should log "Processing job" before execution', async () => {
      processJobSpy.mockResolvedValue(undefined);

      await worker.process(mockJob);

      expect(loggerInfoSpy).toHaveBeenNthCalledWith(1, 'Processing job', {
        jobId: 'job-123',
        type: JobMessagingType.SEND_WELCOME_EMAIL,
        workerId: expect.any(String),
      });
    });

    it('should log "Job completed" after execution', async () => {
      processJobSpy.mockResolvedValue(undefined);

      await worker.process(mockJob);

      expect(loggerInfoSpy).toHaveBeenCalledTimes(2);

      expect(loggerInfoSpy).toHaveBeenNthCalledWith(2, 'Job completed', {
        jobId: 'job-123',
        type: JobMessagingType.SEND_WELCOME_EMAIL,
        workerId: expect.any(String),
      });
    });

    it('should not call logger.error on success', async () => {
      processJobSpy.mockResolvedValue(undefined);

      await worker.process(mockJob);

      expect(loggerErrorSpy).not.toHaveBeenCalled();
    });

    it('should ignore the optional token parameter', async () => {
      processJobSpy.mockResolvedValue(undefined);

      await worker.process(mockJob, 'some-bullmq-token');

      expect(processJobSpy).toHaveBeenCalledWith(mockJob);
    });
  });

  describe('process — failure', () => {
    it('should re-throw the error thrown by processJob', async () => {
      const error = new Error('Processing failed');
      processJobSpy.mockRejectedValue(error);

      await expect(worker.process(mockJob)).rejects.toThrow(error);
    });

    it('should call logger.error with job metadata and the error', async () => {
      const error = new Error('Processing failed');
      processJobSpy.mockRejectedValue(error);

      await expect(worker.process(mockJob)).rejects.toThrow();

      expect(loggerErrorSpy).toHaveBeenCalledTimes(1);

      expect(loggerErrorSpy).toHaveBeenCalledWith('Job failed', {
        jobId: 'job-123',
        type: JobMessagingType.SEND_WELCOME_EMAIL,
        workerId: expect.any(String),
        error,
      });
    });

    it('should log "Processing job" but NOT "Job completed" on failure', async () => {
      processJobSpy.mockRejectedValue(new Error('fail'));

      await expect(worker.process(mockJob)).rejects.toThrow();

      expect(loggerInfoSpy).toHaveBeenCalledTimes(1);

      expect(loggerInfoSpy).toHaveBeenCalledWith('Processing job', expect.any(Object));
    });

    it('should propagate non-Error thrown values', async () => {
      const thrown = 'string-error';
      processJobSpy.mockRejectedValue(thrown);

      await expect(worker.process(mockJob)).rejects.toBe(thrown);

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'Job failed',
        expect.objectContaining({ error: thrown }),
      );
    });
  });

  describe('typing', () => {
    it('should pass Job typed with correct payload to processJob', async () => {
      const typedJob = makeTestJob({ id: 'typed-job' });
      processJobSpy.mockResolvedValue(undefined);

      await worker.process(typedJob);

      expect(processJobSpy).toHaveBeenCalledWith(typedJob);
    });
  });

  describe('audit — with auditRepo', () => {
    let mockAuditRepo: ReturnType<typeof createAuditRepositoryMock>;
    let upsertSpy: jest.SpiedFunction<JobAuditRepository['upsert']>;
    let updateWhereSpy: jest.SpiedFunction<JobAuditRepository['updateWhere']>;

    beforeEach(() => {
      mockAuditRepo = createAuditRepositoryMock();
      worker = new TestWorker(mockAuditRepo);
      processJobSpy = jest.spyOn(worker, 'processJob');
      loggerInfoSpy = jest.spyOn(worker.logger, 'info');
      loggerErrorSpy = jest.spyOn(worker.logger, 'error');
      loggerWarnSpy = jest.spyOn(worker.logger, 'warn');
      upsertSpy = jest.spyOn(mockAuditRepo, 'upsert');
      updateWhereSpy = jest.spyOn(mockAuditRepo, 'updateWhere');
    });

    it('should call auditRepo.upsert on process start with PROCESSING status', async () => {
      mockJob.attemptsMade = 0;
      processJobSpy.mockResolvedValue(undefined);

      await worker.process(mockJob);

      expect(upsertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          jobId: mockJob.id,
          jobType: mockJob.name,
          status: 'PROCESSING',
          workerId: expect.any(String),
          currentAttempt: 1,
          startedAt: expect.any(Date),
        }),
        ['jobId'],
      );
    });

    it('should call auditRepo.updateWhere with COMPLETED on success', async () => {
      mockJob.attemptsMade = 0;
      processJobSpy.mockResolvedValue(undefined);

      await worker.process(mockJob);

      expect(updateWhereSpy).toHaveBeenCalledWith(
        { jobId: mockJob.id },
        expect.objectContaining({
          status: 'COMPLETED',
          finishedAt: expect.any(Date),
        }),
      );
    });

    it('should call auditRepo.updateWhere with FAILED on error', async () => {
      const error = new Error('Job failed');
      mockJob.attemptsMade = 0;
      processJobSpy.mockRejectedValue(error);

      await expect(worker.process(mockJob)).rejects.toThrow(error);

      expect(updateWhereSpy).toHaveBeenCalledWith(
        { jobId: mockJob.id },
        expect.objectContaining({
          status: 'FAILED',
          errorMessage: 'Job failed',
          errorStack: expect.stringContaining('Error: Job failed'),
          currentAttempt: 1,
          finishedAt: expect.any(Date),
        }),
      );
    });

    it('should not call audit if job.id is undefined', async () => {
      const noIdJob = makeTestJob({ id: undefined });
      processJobSpy.mockResolvedValue(undefined);

      await worker.process(noIdJob);

      expect(upsertSpy).not.toHaveBeenCalled();
      expect(updateWhereSpy).not.toHaveBeenCalled();
    });
  });

  describe('idempotence — COMPLETED guard', () => {
    let mockAuditRepo: ReturnType<typeof createAuditRepositoryMock>;
    let findByJobIdSpy: jest.SpiedFunction<JobAuditRepository['findByJobId']>;
    let upsertSpy: jest.SpiedFunction<JobAuditRepository['upsert']>;
    let updateWhereSpy: jest.SpiedFunction<JobAuditRepository['updateWhere']>;

    beforeEach(() => {
      mockAuditRepo = createAuditRepositoryMock();
      worker = new TestWorker(mockAuditRepo);
      processJobSpy = jest.spyOn(worker, 'processJob');
      loggerInfoSpy = jest.spyOn(worker.logger, 'info');
      loggerErrorSpy = jest.spyOn(worker.logger, 'error');
      loggerWarnSpy = jest.spyOn(worker.logger, 'warn');
      findByJobIdSpy = jest.spyOn(mockAuditRepo, 'findByJobId');
      upsertSpy = jest.spyOn(mockAuditRepo, 'upsert');
      updateWhereSpy = jest.spyOn(mockAuditRepo, 'updateWhere');
    });

    it('should skip processJob if job already COMPLETED', async () => {
      mockJob.attemptsMade = 1;
      const completedAudit: Partial<JobAuditEntity> = {
        jobId: mockJob.id,
        status: JobAuditStatus.COMPLETED,
      };
      findByJobIdSpy.mockResolvedValue(completedAudit as JobAuditEntity);

      await worker.process(mockJob);

      expect(processJobSpy).not.toHaveBeenCalled();
      expect(upsertSpy).not.toHaveBeenCalled();
      expect(updateWhereSpy).not.toHaveBeenCalled();
    });

    it('should log warning when job already COMPLETED', async () => {
      mockJob.attemptsMade = 1;
      const completedAudit: Partial<JobAuditEntity> = {
        jobId: mockJob.id,
        status: JobAuditStatus.COMPLETED,
      };
      findByJobIdSpy.mockResolvedValue(completedAudit as JobAuditEntity);

      await worker.process(mockJob);

      expect(loggerWarnSpy).toHaveBeenCalledWith('Job already processed, skipping', {
        jobId: mockJob.id,
        type: mockJob.name,
      });
    });

    it('should process job if audit check throws', async () => {
      mockJob.attemptsMade = 0;
      findByJobIdSpy.mockRejectedValue(new Error('DB error'));
      processJobSpy.mockResolvedValue(undefined);

      await worker.process(mockJob);

      expect(processJobSpy).toHaveBeenCalled();
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'Failed to check job completion status',
        expect.objectContaining({ jobId: mockJob.id }),
      );
    });

    it('should process job if audit returns non-COMPLETED status', async () => {
      mockJob.attemptsMade = 0;
      const processingAudit: Partial<JobAuditEntity> = {
        jobId: mockJob.id,
        status: JobAuditStatus.PROCESSING,
      };
      findByJobIdSpy.mockResolvedValue(processingAudit as JobAuditEntity);
      processJobSpy.mockResolvedValue(undefined);

      await worker.process(mockJob);

      expect(processJobSpy).toHaveBeenCalled();
    });
  });

  describe('audit resilience', () => {
    let mockAuditRepo: ReturnType<typeof createAuditRepositoryMock>;
    let upsertSpy: jest.SpiedFunction<JobAuditRepository['upsert']>;
    let updateWhereSpy: jest.SpiedFunction<JobAuditRepository['updateWhere']>;

    beforeEach(() => {
      mockAuditRepo = createAuditRepositoryMock();
      mockAuditRepo.findByJobId.mockResolvedValue(null);
      worker = new TestWorker(mockAuditRepo);
      processJobSpy = jest.spyOn(worker, 'processJob');
      loggerInfoSpy = jest.spyOn(worker.logger, 'info');
      loggerErrorSpy = jest.spyOn(worker.logger, 'error');
      loggerWarnSpy = jest.spyOn(worker.logger, 'warn');
      upsertSpy = jest.spyOn(mockAuditRepo, 'upsert');
      updateWhereSpy = jest.spyOn(mockAuditRepo, 'updateWhere');
    });

    it('should continue if upsert throws', async () => {
      mockJob.attemptsMade = 0;
      upsertSpy.mockRejectedValue(new Error('Upsert failed'));
      processJobSpy.mockResolvedValue(undefined);

      await worker.process(mockJob);

      expect(processJobSpy).toHaveBeenCalled();
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'Failed to record audit start',
        expect.any(Object),
      );
    });

    it('should re-throw if updateWhere throws on success', async () => {
      mockJob.attemptsMade = 0;
      updateWhereSpy.mockRejectedValue(new Error('Update failed'));
      processJobSpy.mockResolvedValue(undefined);

      await expect(worker.process(mockJob)).rejects.toThrow('Update failed');

      expect(processJobSpy).toHaveBeenCalled();
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'Failed to record audit success',
        expect.any(Object),
      );
    });

    it('should re-throw if updateWhere throws on failure', async () => {
      mockJob.attemptsMade = 0;
      const originalError = new Error('Job logic failed');
      updateWhereSpy.mockRejectedValue(new Error('Audit update failed'));
      processJobSpy.mockRejectedValue(originalError);

      let thrown: Error | undefined;
      try {
        await worker.process(mockJob);
      } catch (err) {
        if (err instanceof Error) {
          thrown = err;
        }
      }

      expect(thrown instanceof Error && thrown.message).toBe('Audit update failed');
      expect(processJobSpy).toHaveBeenCalled();
    });
  });
});
