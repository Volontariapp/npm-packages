import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  afterAll,
  beforeAll,
  jest,
} from '@jest/globals';
import { Redis } from 'ioredis';
import {
  databaseMapper,
  JobsOutboxModel,
  JobsOutboxEntity,
  OutboxStatus,
} from '@volontariapp/database';
import { testDataSource, initializeTestDb, closeTestDb } from '../data-source.js';
import { testRedisOptions } from '../redis-config.js';
import { CommonEventMessagingType } from '@volontariapp/messaging';
import {
  pushTestEventToStream,
  waitFor,
  TestSuccessProcessor,
  TestFailedProcessor,
  makeTestJobOutboxEvent,
} from '../utils/index.js';
import { randomUUID } from 'node:crypto';

describe('JobOutbox PostProcessors Integration', () => {
  let redis: Redis;
  let successProcessor: TestSuccessProcessor;
  let failedProcessor: TestFailedProcessor;

  beforeAll(async () => {
    await initializeTestDb();
    databaseMapper.registerBidirectional(JobsOutboxModel, JobsOutboxEntity);
    redis = new Redis(testRedisOptions);
  });

  afterAll(async () => {
    await redis.quit().catch(() => undefined);
    await closeTestDb().catch(() => undefined);
  });

  beforeEach(async () => {
    const repository = testDataSource.getRepository(JobsOutboxModel);
    await repository.createQueryBuilder().delete().execute();
    await redis.flushdb();
    jest.clearAllMocks();

    const options = {
      streamName: 'stream:test',
      groupName: 'group:test',
      consumerName: 'consumer:test',
      claimIntervalMs: 200,
      claimMinIdleTimeMs: 50,
      blockMs: 50,
    };

    successProcessor = new TestSuccessProcessor(testDataSource, redis, options);
    failedProcessor = new TestFailedProcessor(testDataSource, redis, options);
  });

  afterEach(async () => {
    await successProcessor.stop();
    await failedProcessor.stop();
  });

  describe('JobOutboxSuccessPostProcessor', () => {
    it('should delete the job if it exists', async () => {
      const jobId = randomUUID();
      const repository = testDataSource.getRepository(JobsOutboxModel);
      const job = repository.create({
        id: jobId,
        type: 'test-job',
        emitter: 'test-emitter',
        target: 'test-target',
        status: OutboxStatus.PENDING,
        emitterId: randomUUID(),
        traceId: randomUUID(),
        attempts: 0,
        payload: { action: 'test', data: {} },
        scheduledAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      } as JobsOutboxModel);
      await repository.save(job);

      const eventPayload = makeTestJobOutboxEvent(
        jobId,
        CommonEventMessagingType.JOB_OUTBOX_SUCCESS,
      );

      await pushTestEventToStream(redis, 'stream:test', '123-0', eventPayload);

      await successProcessor.start();

      await waitFor(async () => {
        const exists = await repository.exists({ where: { id: jobId } });
        return !exists;
      }, 3000);

      const exists = await repository.exists({ where: { id: jobId } });
      expect(exists).toBe(false);
    });

    it('should log an error if the job does not exist', async () => {
      const jobId = randomUUID();
      const loggerSpy = jest.spyOn(successProcessor.getLogger(), 'error');

      const eventPayload = makeTestJobOutboxEvent(
        jobId,
        CommonEventMessagingType.JOB_OUTBOX_SUCCESS,
      );

      await pushTestEventToStream(redis, 'stream:test', '123-1', eventPayload);

      await successProcessor.start();

      await waitFor(() => loggerSpy.mock.calls.length > 0, 3000);

      expect(loggerSpy).toHaveBeenCalledWith(
        `Job with id ${jobId} does not exist in outbox`,
        expect.anything(),
      );
    });
  });

  describe('JobOutboxFailedPostProcessor', () => {
    it('should update the job status to FAILED if it exists', async () => {
      const jobId = randomUUID();
      const repository = testDataSource.getRepository(JobsOutboxModel);
      const job = repository.create({
        id: jobId,
        type: 'test-job',
        emitter: 'test-emitter',
        target: 'test-target',
        status: OutboxStatus.PENDING,
        emitterId: randomUUID(),
        traceId: randomUUID(),
        attempts: 0,
        payload: { action: 'test', data: {} },
        scheduledAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await repository.save(job);

      const eventPayload = makeTestJobOutboxEvent(
        jobId,
        CommonEventMessagingType.JOB_OUTBOX_FAILED,
      );

      await pushTestEventToStream(redis, 'stream:test', '123-2', eventPayload);

      await failedProcessor.start();

      await waitFor(async () => {
        const job = await repository.findOneBy({ id: jobId });
        return job?.status === OutboxStatus.FAILED;
      }, 3000);

      const job_fetch = await repository.findOneBy({ id: jobId });
      expect(job_fetch).toBeDefined();
      expect(job_fetch?.status).toBe(OutboxStatus.FAILED);
    });

    it('should log an error if the job does not exist', async () => {
      const jobId = randomUUID();
      const loggerSpy = jest.spyOn(failedProcessor.getLogger(), 'error');

      const eventPayload = makeTestJobOutboxEvent(
        jobId,
        CommonEventMessagingType.JOB_OUTBOX_FAILED,
      );

      await pushTestEventToStream(redis, 'stream:test', '123-3', eventPayload);

      await failedProcessor.start();

      await waitFor(() => loggerSpy.mock.calls.length > 0, 3000);

      expect(loggerSpy).toHaveBeenCalledWith(
        `Job with id ${jobId} does not exist in outbox`,
        expect.anything(),
      );
    });
  });
});
