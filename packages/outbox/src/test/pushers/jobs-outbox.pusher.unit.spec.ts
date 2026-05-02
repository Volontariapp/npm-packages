import { describe, expect, it, beforeEach, jest, afterEach } from '@jest/globals';

const mockQueueAdd = jest.fn();
const mockQueueAddBulk = jest.fn();
const mockQueueClose = jest.fn();

jest.unstable_mockModule('bullmq', () => ({
  Queue: jest.fn().mockImplementation(() => ({
    add: mockQueueAdd,
    addBulk: mockQueueAddBulk,
    close: mockQueueClose,
  })),
}));

const { JobsOutboxPusher } = await import('../../pushers/jobs-outbox.pusher.js');
const { makeLoggerMock } = await import('../utils/helpers/logger-mock.helper.js');
const { makeJobsOutboxEvent } = await import('../utils/helpers/jobs-outbox-event.helper.js');
const { RedisConfig } = await import('@volontariapp/config');
import type { Logger } from '@volontariapp/logger';
import type { JobsOptions } from 'bullmq';

interface MockJob {
  name: string;
  data: unknown;
  opts: JobsOptions;
}

describe('JobsOutboxPusher (Unit)', () => {
  let pusher: InstanceType<typeof JobsOutboxPusher>;
  const loggerMock = makeLoggerMock();
  const redisConfig = new RedisConfig();

  redisConfig.host = 'localhost';
  redisConfig.port = 6378;

  beforeEach(() => {
    jest.clearAllMocks();
    pusher = new JobsOutboxPusher(loggerMock as unknown as Logger, redisConfig);
  });

  afterEach(async () => {
    await pusher.close();
  });

  it('should be defined', () => {
    expect(pusher).toBeDefined();
  });

  describe('pushElement', () => {
    it('should push a job to the correct queue', async () => {
      const entity = makeJobsOutboxEvent({
        id: '1',
        type: 'test.job',
        payload: { data: 'test' },
        target: 'test-service',
        scheduledAt: undefined,
      });

      await pusher.pushElement(entity);

      const { Queue } = await import('bullmq');
      expect(Queue).toHaveBeenCalledWith('test-service', expect.any(Object));
      expect(mockQueueAdd).toHaveBeenCalledWith(
        'test.job',
        { data: 'test' },
        { jobId: 'outbox-1' },
      );
    });

    it('should include delay if scheduledAt is in the future', async () => {
      const futureDate = new Date(Date.now() + 10000);
      const entity = makeJobsOutboxEvent({
        id: '1',
        type: 'test.job',
        payload: { data: 'test' },
        target: 'test-service',
        scheduledAt: futureDate,
      });

      await pusher.pushElement(entity);

      expect(mockQueueAdd).toHaveBeenCalledWith(
        'test.job',
        { data: 'test' },
        expect.objectContaining({
          delay: expect.any(Number),
          jobId: 'outbox-1',
        }),
      );
    });
  });

  describe('pushBulkElement', () => {
    it('should group jobs by target and push them in bulk', async () => {
      const entities = [
        makeJobsOutboxEvent({
          id: '1',
          type: 'job.1',
          payload: { p: 1 },
          target: 'service-a',
          scheduledAt: undefined,
        }),
        makeJobsOutboxEvent({
          id: '2',
          type: 'job.2',
          payload: { p: 2 },
          target: 'service-b',
          scheduledAt: undefined,
        }),
        makeJobsOutboxEvent({
          id: '3',
          type: 'job.3',
          payload: { p: 3 },
          target: 'service-a',
          scheduledAt: undefined,
        }),
      ];

      await pusher.pushBulkElement(entities);

      expect(mockQueueAddBulk).toHaveBeenCalledTimes(2);

      const allBulkCalls = (mockQueueAddBulk as jest.Mock).mock.calls as [MockJob[]][];

      const serviceACall = allBulkCalls.find((call) => call[0].some((job) => job.name === 'job.1'));

      expect(serviceACall).toBeDefined();
      const [jobsA] = serviceACall as [MockJob[]];

      expect(jobsA).toHaveLength(2);
      expect(jobsA).toContainEqual({
        name: 'job.1',
        data: { p: 1 },
        opts: { jobId: 'outbox-1' },
      });
    });
  });
});
