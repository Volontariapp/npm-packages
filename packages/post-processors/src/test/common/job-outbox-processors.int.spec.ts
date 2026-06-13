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
  EventQueueModel,
  EventQueueEntity,
  OutboxStatus,
} from '@volontariapp/database';
import { testDataSource, initializeTestDb, closeTestDb } from '../data-source.js';
import { testRedisOptions } from '../redis-config.js';
import {
  CommonEventMessagingType,
  JobMessagingType,
  EventEventMessagingType,
} from '@volontariapp/messaging';
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
    databaseMapper.registerBidirectional(EventQueueModel, EventQueueEntity);
    redis = new Redis(testRedisOptions);
  });

  afterAll(async () => {
    await redis.quit().catch(() => undefined);
    await closeTestDb().catch(() => undefined);
  });

  beforeEach(async () => {
    const repository = testDataSource.getRepository(JobsOutboxModel);
    const eventQueueRepository = testDataSource.getRepository(EventQueueModel);
    await repository.createQueryBuilder().delete().execute();
    await eventQueueRepository.createQueryBuilder().delete().execute();
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

    it('should generate a SUCCESS feedback event if the job is a fallback job type', async () => {
      const jobId = randomUUID();
      const repository = testDataSource.getRepository(JobsOutboxModel);
      const eventQueueRepository = testDataSource.getRepository(EventQueueModel);

      const job = repository.create({
        id: jobId,
        type: JobMessagingType.FALLBACK_CREATE_EVENT,
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

      const resultPayload = {
        originalPayload: { someData: 'test payload value' },
      };

      const eventPayload = makeTestJobOutboxEvent(
        jobId,
        CommonEventMessagingType.JOB_OUTBOX_SUCCESS,
        JobMessagingType.FALLBACK_CREATE_EVENT,
        resultPayload,
      );

      await pushTestEventToStream(redis, 'stream:test', '123-success-fallback', eventPayload);

      await successProcessor.start();

      await waitFor(async () => {
        const events = await eventQueueRepository.find({ where: { emitterId: jobId } });
        return events.length > 0;
      }, 3000);

      const events = await eventQueueRepository.find({ where: { emitterId: jobId } });
      expect(events.length).toBe(1);
      expect(events[0]?.type).toBe(EventEventMessagingType.FALLBACK_CREATE_EVENT);

      const payload = events[0]?.payload;
      expect(payload.after.status).toBe('SUCCESS');
      expect(payload.after.originalPayload).toEqual({ someData: 'test payload value' });

      const exists = await repository.exists({ where: { id: jobId } });
      expect(exists).toBe(false);
    });

    it('should delete the job but not emit an event if the job type is not mapped', async () => {
      const jobId = randomUUID();
      const repository = testDataSource.getRepository(JobsOutboxModel);
      const eventQueueRepository = testDataSource.getRepository(EventQueueModel);
      const loggerSpy = jest.spyOn(successProcessor.getLogger(), 'debug');

      const job = repository.create({
        id: jobId,
        type: 'unmapped-job-type',
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
        'unmapped-job-type',
        { originalPayload: { foo: 'bar' } },
      );

      await pushTestEventToStream(redis, 'stream:test', '123-success-unmapped', eventPayload);

      await successProcessor.start();

      await waitFor(async () => {
        const exists = await repository.exists({ where: { id: jobId } });
        return !exists;
      }, 3000);

      const events = await eventQueueRepository.find({ where: { emitterId: jobId } });
      expect(events.length).toBe(0);

      const exists = await repository.exists({ where: { id: jobId } });
      expect(exists).toBe(false);

      expect(loggerSpy).toHaveBeenCalledWith(
        `No feedback event emitted for job ${jobId} of type unmapped-job-type`,
        expect.anything(),
      );
    });

    it('should delete the job but not emit an event if originalPayload is missing', async () => {
      const jobId = randomUUID();
      const repository = testDataSource.getRepository(JobsOutboxModel);
      const eventQueueRepository = testDataSource.getRepository(EventQueueModel);
      const loggerSpy = jest.spyOn(successProcessor.getLogger(), 'debug');

      const job = repository.create({
        id: jobId,
        type: JobMessagingType.FALLBACK_CREATE_EVENT,
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
        JobMessagingType.FALLBACK_CREATE_EVENT,
        { someOtherData: 'foo' },
      );

      await pushTestEventToStream(redis, 'stream:test', '123-success-no-payload', eventPayload);

      await successProcessor.start();

      await waitFor(async () => {
        const exists = await repository.exists({ where: { id: jobId } });
        return !exists;
      }, 3000);

      const events = await eventQueueRepository.find({ where: { emitterId: jobId } });
      expect(events.length).toBe(0);

      const exists = await repository.exists({ where: { id: jobId } });
      expect(exists).toBe(false);

      expect(loggerSpy).not.toHaveBeenCalledWith(
        expect.stringContaining(`No feedback event emitted for job`),
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

    it('should generate a FAILED feedback event if the job is a fallback job type', async () => {
      const jobId = randomUUID();
      const repository = testDataSource.getRepository(JobsOutboxModel);
      const eventQueueRepository = testDataSource.getRepository(EventQueueModel);

      const originalJobPayload = { someData: 'failed payload value' };

      const job = repository.create({
        id: jobId,
        type: JobMessagingType.FALLBACK_UPDATE_EVENT,
        emitter: 'test-emitter',
        target: 'test-target',
        status: OutboxStatus.PENDING,
        emitterId: randomUUID(),
        traceId: randomUUID(),
        attempts: 0,
        payload: originalJobPayload,
        scheduledAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await repository.save(job);

      const eventPayload = makeTestJobOutboxEvent(
        jobId,
        CommonEventMessagingType.JOB_OUTBOX_FAILED,
        JobMessagingType.FALLBACK_UPDATE_EVENT,
        {},
        'Test error message',
      );

      await pushTestEventToStream(redis, 'stream:test', '123-failed-fallback', eventPayload);

      await failedProcessor.start();

      await waitFor(async () => {
        const events = await eventQueueRepository.find({ where: { emitterId: jobId } });
        return events.length > 0;
      }, 3000);

      const events = await eventQueueRepository.find({ where: { emitterId: jobId } });
      expect(events.length).toBe(1);
      expect(events[0]?.type).toBe(EventEventMessagingType.FALLBACK_UPDATE_EVENT);

      const payload = events[0]?.payload;
      expect(payload.after.status).toBe('FAILED');
      expect(payload.after.originalPayload).toEqual(originalJobPayload);
      expect(payload.after.error).toBe('Test error message');

      const job_fetch = await repository.findOneBy({ id: jobId });
      expect(job_fetch?.status).toBe(OutboxStatus.FAILED);
    });

    it('should update job status but not emit an event if the job type is not mapped', async () => {
      const jobId = randomUUID();
      const repository = testDataSource.getRepository(JobsOutboxModel);
      const eventQueueRepository = testDataSource.getRepository(EventQueueModel);
      const loggerSpy = jest.spyOn(failedProcessor.getLogger(), 'debug');

      const job = repository.create({
        id: jobId,
        type: 'unmapped-job-type',
        emitter: 'test-emitter',
        target: 'test-target',
        status: OutboxStatus.PENDING,
        emitterId: randomUUID(),
        traceId: randomUUID(),
        attempts: 0,
        payload: { foo: 'bar' },
        scheduledAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await repository.save(job);

      const eventPayload = makeTestJobOutboxEvent(
        jobId,
        CommonEventMessagingType.JOB_OUTBOX_FAILED,
        'unmapped-job-type',
        {},
        'Test error message',
      );

      await pushTestEventToStream(redis, 'stream:test', '123-failed-unmapped', eventPayload);

      await failedProcessor.start();

      await waitFor(async () => {
        const job_fetch = await repository.findOneBy({ id: jobId });
        return job_fetch?.status === OutboxStatus.FAILED;
      }, 3000);

      const events = await eventQueueRepository.find({ where: { emitterId: jobId } });
      expect(events.length).toBe(0);

      const job_fetch = await repository.findOneBy({ id: jobId });
      expect(job_fetch?.status).toBe(OutboxStatus.FAILED);

      expect(loggerSpy).toHaveBeenCalledWith(
        `No feedback event emitted for failed job ${jobId} of type unmapped-job-type`,
        expect.anything(),
      );
    });

    it('should update job status but not emit an event if jobType is missing in payload', async () => {
      const jobId = randomUUID();
      const repository = testDataSource.getRepository(JobsOutboxModel);
      const eventQueueRepository = testDataSource.getRepository(EventQueueModel);
      const loggerSpy = jest.spyOn(failedProcessor.getLogger(), 'debug');

      const job = repository.create({
        id: jobId,
        type: JobMessagingType.FALLBACK_UPDATE_EVENT,
        emitter: 'test-emitter',
        target: 'test-target',
        status: OutboxStatus.PENDING,
        emitterId: randomUUID(),
        traceId: randomUUID(),
        attempts: 0,
        payload: { foo: 'bar' },
        scheduledAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await repository.save(job);

      const eventPayload = makeTestJobOutboxEvent(
        jobId,
        CommonEventMessagingType.JOB_OUTBOX_FAILED,
        '',
        {},
        'Test error message',
      );

      await pushTestEventToStream(redis, 'stream:test', '123-failed-missing-type', eventPayload);

      await failedProcessor.start();

      await waitFor(async () => {
        const job_fetch = await repository.findOneBy({ id: jobId });
        return job_fetch?.status === OutboxStatus.FAILED;
      }, 3000);

      const events = await eventQueueRepository.find({ where: { emitterId: jobId } });
      expect(events.length).toBe(0);

      const job_fetch = await repository.findOneBy({ id: jobId });
      expect(job_fetch?.status).toBe(OutboxStatus.FAILED);

      expect(loggerSpy).not.toHaveBeenCalledWith(
        expect.stringContaining(`No feedback event emitted for failed job`),
        expect.anything(),
      );
    });
  });
});
