import { describe, expect, it, beforeEach, jest, afterEach } from '@jest/globals';
import { UnprocessableEntityError } from '@volontariapp/errors';
import { JobsOutboxDispatcher } from '../../../dispatchers/jobs-outbox.dispatcher.js';
import { OutboxStatus } from '@volontariapp/database';
import { makeLoggerMock } from '../../utils/helpers/shared/logger-mock.helper.js';
import {
  makeJobsOutboxRepositoryMock,
  type JobsOutboxRepositoryMock,
} from '../../utils/helpers/job/jobs-outbox-repository-mock.helper.js';
import { makeJobsOutboxEvent } from '../../utils/helpers/job/jobs-outbox-event.helper.js';

describe('JobsOutboxDispatcher (Unit)', () => {
  let dispatcher: JobsOutboxDispatcher;
  let repositoryMock: JobsOutboxRepositoryMock;

  beforeEach(() => {
    repositoryMock = makeJobsOutboxRepositoryMock();
    const loggerMock = makeLoggerMock();
    dispatcher = new JobsOutboxDispatcher(loggerMock, repositoryMock);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('markAsProcessing', () => {
    it('should mark job as processing and update repository', async () => {
      const job = makeJobsOutboxEvent({ status: OutboxStatus.PENDING });
      const updateSpy = jest.spyOn(repositoryMock, 'update');

      await dispatcher.markAsProcessing(job);

      expect(job.status).toBe(OutboxStatus.PROCESSING);
      expect(updateSpy as jest.Mock).toHaveBeenCalledWith(job.id, job);
    });

    it('should throw UnprocessableEntityError if job is not in PENDING status', () => {
      const job = makeJobsOutboxEvent({ status: OutboxStatus.PROCESSING });
      expect(() => dispatcher.markAsProcessing(job)).toThrow(UnprocessableEntityError);
    });
  });

  describe('markAsFailed', () => {
    it('should mark job as failed with error and update repository', async () => {
      const job = makeJobsOutboxEvent({ status: OutboxStatus.PROCESSING });
      const error = 'Job execution failed';
      const updateSpy = jest.spyOn(repositoryMock, 'update');

      await dispatcher.markAsFailed(job, error);

      expect(job.status).toBe(OutboxStatus.FAILED);
      expect(job.lastError).toBe(error);
      expect(job.attempts).toBe(1);
      expect(updateSpy as jest.Mock).toHaveBeenCalledWith(job.id, job);
    });

    it('should throw UnprocessableEntityError if job is not in PROCESSING status', () => {
      const job = makeJobsOutboxEvent({ status: OutboxStatus.PENDING });
      expect(() => dispatcher.markAsFailed(job)).toThrow(UnprocessableEntityError);
    });
  });

  describe('markAsCompleted', () => {
    it('should mark job as completed and update repository', async () => {
      const job = makeJobsOutboxEvent({ status: OutboxStatus.PROCESSING });
      const updateSpy = jest.spyOn(repositoryMock, 'update');

      await dispatcher.markAsCompleted(job);

      expect(job.status).toBe(OutboxStatus.COMPLETED);
      expect(updateSpy as jest.Mock).toHaveBeenCalledWith(job.id, job);
    });

    it('should throw UnprocessableEntityError if job is not in PROCESSING status', () => {
      const job = makeJobsOutboxEvent({ status: OutboxStatus.PENDING });
      expect(() => dispatcher.markAsCompleted(job)).toThrow(UnprocessableEntityError);
    });
  });
});
