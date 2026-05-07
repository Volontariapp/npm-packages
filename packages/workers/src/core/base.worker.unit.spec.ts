import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import type { Job } from 'bullmq';
import type { JobRegistry } from '@volontariapp/messaging';

const mockInfo = jest.fn();
const mockError = jest.fn();

jest.unstable_mockModule('@nestjs/bullmq', () => ({
  WorkerHost: class WorkerHost {},
}));

jest.unstable_mockModule('@volontariapp/logger', () => ({
  Logger: jest.fn().mockImplementation(() => ({
    info: mockInfo,
    error: mockError,
  })),
}));

const { BaseWorker } = await import('./base.worker.js');
const { JobMessagingType } = await import('@volontariapp/messaging');

type TestJobType = typeof JobMessagingType.SEND_WELCOME_EMAIL;
type TestJob = Job<JobRegistry[TestJobType], void, TestJobType>;

class TestWorker extends BaseWorker<TestJobType> {
  public processJob = jest.fn() as jest.MockedFunction<(job: TestJob) => Promise<void>>;
}

describe('BaseWorker', () => {
  let worker: TestWorker;
  let mockJob: TestJob;

  beforeEach(() => {
    jest.clearAllMocks();

    worker = new TestWorker();

    mockJob = {
      id: 'job-123',
      name: JobMessagingType.SEND_WELCOME_EMAIL,
    } as TestJob;
  });

  describe('process — success', () => {
    it('should call processJob with the job', async () => {
      // Arrange
      worker.processJob.mockResolvedValue(undefined);

      // Act
      await worker.process(mockJob);

      // Assert
      expect(worker.processJob).toHaveBeenCalledTimes(1);
      expect(worker.processJob).toHaveBeenCalledWith(mockJob);
    });

    it('should log "Processing job" before execution', async () => {
      // Arrange
      worker.processJob.mockResolvedValue(undefined);

      // Act
      await worker.process(mockJob);

      // Assert
      expect(mockInfo).toHaveBeenNthCalledWith(1, 'Processing job', {
        jobId: 'job-123',
        type: JobMessagingType.SEND_WELCOME_EMAIL,
        workerId: expect.any(String),
      });
    });

    it('should log "Job completed" after execution', async () => {
      // Arrange
      worker.processJob.mockResolvedValue(undefined);

      // Act
      await worker.process(mockJob);

      // Assert
      expect(mockInfo).toHaveBeenCalledTimes(2);
      expect(mockInfo).toHaveBeenNthCalledWith(2, 'Job completed', {
        jobId: 'job-123',
        type: JobMessagingType.SEND_WELCOME_EMAIL,
        workerId: expect.any(String),
      });
    });

    it('should not call logger.error on success', async () => {
      // Arrange
      worker.processJob.mockResolvedValue(undefined);

      // Act
      await worker.process(mockJob);

      // Assert
      expect(mockError).not.toHaveBeenCalled();
    });

    it('should ignore the optional token parameter', async () => {
      // Arrange
      worker.processJob.mockResolvedValue(undefined);

      // Act
      await worker.process(mockJob, 'some-bullmq-token');

      // Assert
      expect(worker.processJob).toHaveBeenCalledWith(mockJob);
    });
  });

  describe('process — failure', () => {
    it('should re-throw the error thrown by processJob', async () => {
      // Arrange
      const error = new Error('Processing failed');
      worker.processJob.mockRejectedValue(error);

      // Act & Assert
      await expect(worker.process(mockJob)).rejects.toThrow(error);
    });

    it('should call logger.error with job metadata and the error', async () => {
      // Arrange
      const error = new Error('Processing failed');
      worker.processJob.mockRejectedValue(error);

      // Act
      await expect(worker.process(mockJob)).rejects.toThrow();

      // Assert
      expect(mockError).toHaveBeenCalledTimes(1);
      expect(mockError).toHaveBeenCalledWith('Job failed', {
        jobId: 'job-123',
        type: JobMessagingType.SEND_WELCOME_EMAIL,
        workerId: expect.any(String),
        error,
      });
    });

    it('should log "Processing job" but NOT "Job completed" on failure', async () => {
      // Arrange
      worker.processJob.mockRejectedValue(new Error('fail'));

      // Act
      await expect(worker.process(mockJob)).rejects.toThrow();

      // Assert
      expect(mockInfo).toHaveBeenCalledTimes(1);
      expect(mockInfo).toHaveBeenCalledWith('Processing job', expect.any(Object));
    });

    it('should propagate non-Error thrown values', async () => {
      // Arrange
      const thrown = 'string-error';
      worker.processJob.mockRejectedValue(thrown);

      // Act & Assert
      await expect(worker.process(mockJob)).rejects.toBe(thrown);
      expect(mockError).toHaveBeenCalledWith(
        'Job failed',
        expect.objectContaining({ error: thrown }),
      );
    });
  });

  describe('typing', () => {
    it('should pass Job typed with correct payload to processJob', async () => {
      // Arrange
      const typedJob = {
        id: 'typed-job',
        name: JobMessagingType.SEND_WELCOME_EMAIL,
      } as TestJob;
      worker.processJob.mockResolvedValue(undefined);

      // Act
      await worker.process(typedJob);

      // Assert — TypeScript would fail at compile time if types were wrong
      expect(worker.processJob).toHaveBeenCalledWith(typedJob);
    });
  });
});
