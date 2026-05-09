import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { JobMessagingType } from '@volontariapp/messaging';
import { TestWorker, makeTestJob, type TestJob } from '../../utils/index.js';

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
});
