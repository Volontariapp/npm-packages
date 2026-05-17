import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { JobMessagingType } from '@volontariapp/messaging';
import {
  TestWorker,
  makeTestJob,
  type TestJob,
  createAuditRepositoryMock,
} from '../../utils/index.js';
import { JobAuditStatus } from '../../../data/types/job-audit.status.js';
import type { JobAuditEntity } from '../../../data/entities/job-audit.entity.js';

describe('BaseWorker', () => {
  let worker: TestWorker;
  let mockJob: TestJob;

  beforeEach(() => {
    jest.clearAllMocks();
    worker = new TestWorker();
    mockJob = makeTestJob();
  });

  describe('process — success', () => {
    it('should call processJob with the job', async () => {
      worker.processJob.mockResolvedValue(undefined);

      await worker.process(mockJob);

      expect(worker.processJob).toHaveBeenCalledTimes(1);
      expect(worker.processJob).toHaveBeenCalledWith(mockJob);
    });

    it('should log "Processing job" before execution', async () => {
      worker.processJob.mockResolvedValue(undefined);

      await worker.process(mockJob);

      expect(worker.logger.info).toHaveBeenNthCalledWith(1, 'Processing job', {
        jobId: 'job-123',
        type: JobMessagingType.SEND_WELCOME_EMAIL,
        workerId: expect.any(String),
      });
    });

    it('should log "Job completed" after execution', async () => {
      worker.processJob.mockResolvedValue(undefined);

      await worker.process(mockJob);

      expect(worker.logger.info).toHaveBeenCalledTimes(2);

      expect(worker.logger.info).toHaveBeenNthCalledWith(2, 'Job completed', {
        jobId: 'job-123',
        type: JobMessagingType.SEND_WELCOME_EMAIL,
        workerId: expect.any(String),
      });
    });

    it('should not call logger.error on success', async () => {
      worker.processJob.mockResolvedValue(undefined);

      await worker.process(mockJob);

      expect(worker.logger.error).not.toHaveBeenCalled();
    });

    it('should ignore the optional token parameter', async () => {
      worker.processJob.mockResolvedValue(undefined);

      await worker.process(mockJob, 'some-bullmq-token');

      expect(worker.processJob).toHaveBeenCalledWith(mockJob);
    });
  });

  describe('process — failure', () => {
    it('should re-throw the error thrown by processJob', async () => {
      const error = new Error('Processing failed');
      worker.processJob.mockRejectedValue(error);

      await expect(worker.process(mockJob)).rejects.toThrow(error);
    });

    it('should call logger.error with job metadata and the error', async () => {
      const error = new Error('Processing failed');
      worker.processJob.mockRejectedValue(error);

      await expect(worker.process(mockJob)).rejects.toThrow();

      expect(worker.logger.error).toHaveBeenCalledTimes(1);

      expect(worker.logger.error).toHaveBeenCalledWith('Job failed', {
        jobId: 'job-123',
        type: JobMessagingType.SEND_WELCOME_EMAIL,
        workerId: expect.any(String),
        error,
      });
    });

    it('should log "Processing job" but NOT "Job completed" on failure', async () => {
      worker.processJob.mockRejectedValue(new Error('fail'));

      await expect(worker.process(mockJob)).rejects.toThrow();

      expect(worker.logger.info).toHaveBeenCalledTimes(1);

      expect(worker.logger.info).toHaveBeenCalledWith('Processing job', expect.any(Object));
    });

    it('should propagate non-Error thrown values', async () => {
      const thrown = 'string-error';
      worker.processJob.mockRejectedValue(thrown);

      await expect(worker.process(mockJob)).rejects.toBe(thrown);

      expect(worker.logger.error).toHaveBeenCalledWith(
        'Job failed',
        expect.objectContaining({ error: thrown }),
      );
    });
  });

  describe('typing', () => {
    it('should pass Job typed with correct payload to processJob', async () => {
      const typedJob = makeTestJob({ id: 'typed-job' });
      worker.processJob.mockResolvedValue(undefined);

      await worker.process(typedJob);

      expect(worker.processJob).toHaveBeenCalledWith(typedJob);
    });
  });

  describe('audit — with auditRepo', () => {
    let mockAuditRepo: ReturnType<typeof createAuditRepositoryMock>;

    beforeEach(() => {
      mockAuditRepo = createAuditRepositoryMock();
      worker = new TestWorker(mockAuditRepo);
    });

    it('should call auditRepo.upsert on process start with PROCESSING status', async () => {
      mockJob.attemptsMade = 0;
      worker.processJob.mockResolvedValue(undefined);

      await worker.process(mockJob);

      expect(mockAuditRepo.upsert).toHaveBeenCalledWith(
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
      worker.processJob.mockResolvedValue(undefined);

      await worker.process(mockJob);

      expect(mockAuditRepo.updateWhere).toHaveBeenCalledWith(
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
      worker.processJob.mockRejectedValue(error);

      await expect(worker.process(mockJob)).rejects.toThrow(error);

      expect(mockAuditRepo.updateWhere).toHaveBeenCalledWith(
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
      worker.processJob.mockResolvedValue(undefined);

      await worker.process(noIdJob);

      expect(mockAuditRepo.upsert).not.toHaveBeenCalled();
      expect(mockAuditRepo.updateWhere).not.toHaveBeenCalled();
    });
  });

  describe('idempotence — COMPLETED guard', () => {
    let mockAuditRepo: ReturnType<typeof createAuditRepositoryMock>;

    beforeEach(() => {
      mockAuditRepo = createAuditRepositoryMock();
      worker = new TestWorker(mockAuditRepo);
    });

    it('should skip processJob if job already COMPLETED', async () => {
      mockJob.attemptsMade = 1;
      const completedAudit: Partial<JobAuditEntity> = {
        jobId: mockJob.id,
        status: JobAuditStatus.COMPLETED,
      };
      mockAuditRepo.findByJobId.mockResolvedValue(completedAudit as JobAuditEntity);

      await worker.process(mockJob);

      expect(worker.processJob).not.toHaveBeenCalled();
      expect(mockAuditRepo.upsert).not.toHaveBeenCalled();
      expect(mockAuditRepo.updateWhere).not.toHaveBeenCalled();
    });

    it('should log warning when job already COMPLETED', async () => {
      mockJob.attemptsMade = 1;
      const completedAudit: Partial<JobAuditEntity> = {
        jobId: mockJob.id,
        status: JobAuditStatus.COMPLETED,
      };
      mockAuditRepo.findByJobId.mockResolvedValue(completedAudit as JobAuditEntity);

      await worker.process(mockJob);

      expect(worker.logger.warn).toHaveBeenCalledWith('Job already processed, skipping', {
        jobId: mockJob.id,
        type: mockJob.name,
      });
    });

    it('should process job if audit check throws', async () => {
      mockJob.attemptsMade = 0;
      mockAuditRepo.findByJobId.mockRejectedValue(new Error('DB error'));
      worker.processJob.mockResolvedValue(undefined);

      await worker.process(mockJob);

      expect(worker.processJob).toHaveBeenCalled();
      expect(worker.logger.error).toHaveBeenCalledWith(
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
      mockAuditRepo.findByJobId.mockResolvedValue(processingAudit as JobAuditEntity);
      worker.processJob.mockResolvedValue(undefined);

      await worker.process(mockJob);

      expect(worker.processJob).toHaveBeenCalled();
    });
  });

  describe('audit resilience', () => {
    let mockAuditRepo: ReturnType<typeof createAuditRepositoryMock>;

    beforeEach(() => {
      mockAuditRepo = createAuditRepositoryMock();
      mockAuditRepo.findByJobId.mockResolvedValue(null);
      worker = new TestWorker(mockAuditRepo);
    });

    it('should continue if upsert throws', async () => {
      mockJob.attemptsMade = 0;
      mockAuditRepo.upsert.mockRejectedValue(new Error('Upsert failed'));
      worker.processJob.mockResolvedValue(undefined);

      await worker.process(mockJob);

      expect(worker.processJob).toHaveBeenCalled();
      expect(worker.logger.error).toHaveBeenCalledWith(
        'Failed to record audit start',
        expect.any(Object),
      );
    });

    it('should re-throw if updateWhere throws on success', async () => {
      mockJob.attemptsMade = 0;
      mockAuditRepo.updateWhere.mockRejectedValue(new Error('Update failed'));
      worker.processJob.mockResolvedValue(undefined);

      await expect(worker.process(mockJob)).rejects.toThrow('Update failed');

      expect(worker.processJob).toHaveBeenCalled();
      expect(worker.logger.error).toHaveBeenCalledWith(
        'Failed to record audit success',
        expect.any(Object),
      );
    });

    it('should re-throw if updateWhere throws on failure', async () => {
      mockJob.attemptsMade = 0;
      const originalError = new Error('Job logic failed');
      mockAuditRepo.updateWhere.mockRejectedValue(new Error('Audit update failed'));
      worker.processJob.mockRejectedValue(originalError);

      let thrown: Error | undefined;
      try {
        await worker.process(mockJob);
      } catch (error) {
        thrown = error as Error;
      }

      expect(thrown instanceof Error && thrown.message).toBe('Audit update failed');
      expect(worker.processJob).toHaveBeenCalled();
    });
  });
});
