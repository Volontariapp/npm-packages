import { describe, expect, it, beforeEach, jest, afterEach } from '@jest/globals';
import type { Job } from 'bullmq';
import {
  setupBullMQMock,
  mockQueue,
  type MockJob,
} from '../../utils/helpers/shared/bullmq-mock.helper.js';
import { makeRedisMock } from '../../utils/helpers/shared/redis-mock.helper.js';

setupBullMQMock();

const { JobsOutboxPusher } = await import('../../../pushers/jobs-outbox.pusher.js');
const { makeLoggerMock } = await import('../../utils/helpers/shared/logger-mock.helper.js');
const { makeJobsOutboxEvent } = await import('../../utils/helpers/job/jobs-outbox-event.helper.js');

describe('JobsOutboxPusher (Unit)', () => {
  let pusher: InstanceType<typeof JobsOutboxPusher>;
  const loggerMock = makeLoggerMock();
  const redisMock = makeRedisMock();

  // Spies
  let addSpy: jest.SpiedFunction<typeof mockQueue.add>;
  let addBulkSpy: jest.SpiedFunction<(jobs: MockJob[]) => Promise<Job[]>>;
  let loggerErrorSpy: jest.SpiedFunction<typeof loggerMock.error>;

  beforeEach(() => {
    jest.clearAllMocks();

    addSpy = jest.spyOn(mockQueue, 'add');
    addBulkSpy = jest.spyOn(mockQueue, 'addBulk') as jest.SpiedFunction<
      (jobs: MockJob[]) => Promise<Job[]>
    >;
    loggerErrorSpy = jest.spyOn(loggerMock, 'error');

    pusher = new JobsOutboxPusher(loggerMock, redisMock);
  });

  afterEach(async () => {
    await pusher.close();
  });

  it('should be defined', () => {
    expect(pusher).toBeDefined();
  });

  describe('pushElement', () => {
    it('should push a job to the correct queue', async () => {
      // Arrange
      const entity = makeJobsOutboxEvent({
        id: '1',
        type: 'test.job',
        payload: { data: 'test' },
        target: 'test-service',
        scheduledAt: undefined,
      });

      // Act
      await pusher.pushElement(entity);

      // Assert
      const { Queue } = await import('bullmq');
      expect(Queue).toHaveBeenCalledWith(
        'test-service',
        expect.objectContaining({ connection: redisMock }),
      );
      expect(addSpy).toHaveBeenCalledWith('test.job', { data: 'test' }, { jobId: '1' });
    });

    it('should include delay if scheduledAt is in the future', async () => {
      // Arrange
      const futureDate = new Date(Date.now() + 10000);
      const entity = makeJobsOutboxEvent({
        id: '1',
        type: 'test.job',
        payload: { data: 'test' },
        target: 'test-service',
        scheduledAt: futureDate,
      });

      // Act
      await pusher.pushElement(entity);

      // Assert
      expect(addSpy).toHaveBeenCalledWith(
        'test.job',
        { data: 'test' },
        expect.objectContaining({
          delay: expect.any(Number),
          jobId: '1',
        }),
      );
    });

    it('should throw and log error if queue.add fails', async () => {
      // Arrange
      const entity = makeJobsOutboxEvent({
        id: '1',
        type: 'test.job',
        target: 'test-service',
      });
      const error = new Error('Queue error');
      addSpy.mockRejectedValueOnce(error);

      // Act & Assert
      await expect(pusher.pushElement(entity)).rejects.toThrow('Queue error');
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to push job outbox item 1'),
        expect.objectContaining({ error }),
      );
    });
  });

  describe('pushBulkElement', () => {
    it('should group jobs by target and push them in bulk', async () => {
      // Arrange
      const entities = [
        makeJobsOutboxEvent({ id: '1', type: 'job.1', target: 'service-a' }),
        makeJobsOutboxEvent({ id: '2', type: 'job.2', target: 'service-b' }),
        makeJobsOutboxEvent({ id: '3', type: 'job.3', target: 'service-a' }),
      ];

      // Act
      await pusher.pushBulkElement(entities);

      // Assert
      expect(addBulkSpy).toHaveBeenCalledTimes(2);

      const allBulkCalls = addBulkSpy.mock.calls;
      const serviceACall = allBulkCalls.find((call) => call[0].some((job) => job.name === 'job.1'));

      expect(serviceACall).toBeDefined();

      if (!serviceACall) {
        throw new Error('serviceACall is undefined');
      }

      const [jobsA] = serviceACall;

      expect(jobsA).toHaveLength(2);
      expect(jobsA).toContainEqual(
        expect.objectContaining({
          name: 'job.1',
          opts: expect.objectContaining({ jobId: '1' }),
        }),
      );
    });

    it('should throw and log error if queue.addBulk fails', async () => {
      // Arrange
      const entities = [makeJobsOutboxEvent({ id: '1', target: 'service-a' })];
      const error = new Error('Bulk error');
      addBulkSpy.mockRejectedValueOnce(error);

      // Act & Assert
      await expect(pusher.pushBulkElement(entities)).rejects.toThrow('Bulk error');
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to push bulk job outbox items'),
        expect.objectContaining({ error }),
      );
    });
  });
});
