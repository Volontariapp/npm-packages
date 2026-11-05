import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import type { Redis } from 'ioredis';
import { createMock } from '@volontariapp/testing';
import { resetStreamMetricsForTests } from '../../../../core/metrics/stream-metrics.js';
import {
  TestBatchPostProcessor,
  TestPostProcessor,
  TestEventId,
  TestMessagingConsumer,
  TestMessagingGroup,
  TestMessagingStream,
  makeInfrastructureError,
  makeTestEvent,
  mockRedisCall,
  mockRedisXreadgroup,
  mockStreamMeter,
  waitFor,
  type StreamMeterMock,
} from '../../../utils/index.js';
import type { PostProcessorOptions } from '../../../../interfaces/index.js';

const PROCESSED = 'volontariapp.redis_streams.processed';
const RETRY_ATTEMPTS = 'volontariapp.redis_streams.retry_attempts';
const DLQ_SENT = 'volontariapp.redis_streams.dlq_sent';
const LENGTH = 'volontariapp.redis_streams.length';

function baseOptions(overrides: Partial<PostProcessorOptions> = {}): PostProcessorOptions {
  return {
    streamName: TestMessagingStream.TEST_STREAM,
    groupName: TestMessagingGroup.TEST_GROUP,
    consumerName: TestMessagingConsumer.TEST_CONSUMER,
    claimIntervalMs: 50,
    claimMinIdleTimeMs: 100,
    ...overrides,
  };
}

describe('Post-processor Redis Streams metrics - Unit', () => {
  let redisMock: jest.Mocked<Redis>;
  let callMock: ReturnType<typeof mockRedisCall>;
  let meter: StreamMeterMock;
  let stopProcessor: () => Promise<void>;

  beforeEach(() => {
    resetStreamMetricsForTests();
    redisMock = createMock<Redis>();
    redisMock.duplicate.mockReturnValue(redisMock);
    callMock = mockRedisCall(redisMock);
    meter = mockStreamMeter();
    stopProcessor = () => Promise.resolve();
  });

  afterEach(async () => {
    await stopProcessor();
    jest.restoreAllMocks();
    resetStreamMetricsForTests();
  });

  describe('SinglePostProcessor', () => {
    let processor: TestPostProcessor;

    function createProcessor(overrides: Partial<PostProcessorOptions> = {}): void {
      processor = new TestPostProcessor(redisMock, baseOptions(overrides));
      stopProcessor = () => processor.stop();
    }

    it('counts a successfully processed message', async () => {
      createProcessor();
      mockRedisXreadgroup(callMock, TestMessagingStream.TEST_STREAM, [
        { messageId: TestEventId.MSG_PENDING, event: makeTestEvent(TestEventId.DEFAULT) },
      ]);

      await processor.start();
      await waitFor(() => meter.counterTotal(PROCESSED) === 1);

      expect(meter.counterTotal(RETRY_ATTEMPTS)).toBe(0);
    });

    it('does not count a message skipped by shouldProcess', async () => {
      createProcessor();
      processor.shouldProcessVal = false;
      const acknowledgeSpy = jest.spyOn(processor, 'acknowledge');
      mockRedisXreadgroup(callMock, TestMessagingStream.TEST_STREAM, [
        { messageId: TestEventId.MSG_PENDING, event: makeTestEvent(TestEventId.DEFAULT) },
      ]);

      await processor.start();
      await waitFor(() => acknowledgeSpy.mock.calls.length > 0);

      expect(meter.counterTotal(PROCESSED)).toBe(0);
    });

    it('counts a retry attempt when the handler fails', async () => {
      createProcessor();
      processor.processError = new Error('Transient error');
      mockRedisXreadgroup(callMock, TestMessagingStream.TEST_STREAM, [
        { messageId: TestEventId.MSG_PENDING, event: makeTestEvent(TestEventId.DEFAULT) },
      ]);

      await processor.start();
      await waitFor(() => meter.counterTotal(RETRY_ATTEMPTS) === 1);

      expect(meter.counterTotal(PROCESSED)).toBe(0);
      expect(meter.counterTotal(DLQ_SENT)).toBe(0);
    });

    it('counts the last attempt and the DLQ write when retries are exhausted', async () => {
      createProcessor({ retry: { maxRetries: 1 } });
      processor.processError = new Error('Permanent error');
      mockRedisXreadgroup(callMock, TestMessagingStream.TEST_STREAM, [
        { messageId: TestEventId.MSG_PENDING, event: makeTestEvent(TestEventId.DEFAULT) },
      ]);

      await processor.start();
      await waitFor(() => meter.counterTotal(DLQ_SENT) === 1);

      expect(meter.counterTotal(RETRY_ATTEMPTS)).toBe(1);
    });

    it('does not count an infrastructure error as an attempt', async () => {
      createProcessor();
      processor.processError = makeInfrastructureError();
      const incrSpy = jest.spyOn(redisMock, 'incr');
      mockRedisXreadgroup(callMock, TestMessagingStream.TEST_STREAM, [
        { messageId: TestEventId.MSG_PENDING, event: makeTestEvent(TestEventId.DEFAULT) },
      ]);

      await processor.start();
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(incrSpy).not.toHaveBeenCalled();
      expect(meter.counterTotal(RETRY_ATTEMPTS)).toBe(0);
      expect(meter.counterTotal(PROCESSED)).toBe(0);
    });

    it('reports the gauges while running and stops after stop()', async () => {
      createProcessor();
      jest.spyOn(redisMock, 'call').mockImplementation(async (command: string) => {
        if (command === 'XLEN') return 9;
        if (command === 'XREADGROUP') {
          await new Promise((resolve) => setTimeout(resolve, 20));
          return [];
        }
        return 'OK';
      });

      await processor.start();
      expect(await meter.collectGauge(LENGTH)).toHaveLength(1);

      await processor.stop();
      expect(await meter.collectGauge(LENGTH)).toEqual([]);
    });

    it('does not report gauges when the consumer group cannot be created', async () => {
      createProcessor();
      jest.spyOn(redisMock, 'call').mockRejectedValue(new Error('NOAUTH'));

      await expect(processor.start()).rejects.toThrow('NOAUTH');
      expect(await meter.collectGauge(LENGTH)).toEqual([]);
    });
  });

  describe('BatchPostProcessor', () => {
    let processor: TestBatchPostProcessor;

    function createProcessor(): void {
      processor = new TestBatchPostProcessor(redisMock, baseOptions());
      stopProcessor = () => processor.stop();
    }

    it('counts messages, not batches', async () => {
      createProcessor();
      mockRedisXreadgroup(callMock, TestMessagingStream.TEST_STREAM, [
        { messageId: '1-0', event: makeTestEvent(TestEventId.DEFAULT) },
        { messageId: '2-0', event: makeTestEvent(TestEventId.DEFAULT) },
        { messageId: '3-0', event: makeTestEvent(TestEventId.DEFAULT) },
      ]);

      await processor.start();
      await waitFor(() => meter.counterTotal(PROCESSED) === 3);

      expect(processor.processedBatches).toHaveLength(1);
    });

    it('counts one retry attempt per message of a failed batch', async () => {
      createProcessor();
      processor.processError = new Error('Batch failure');
      mockRedisXreadgroup(callMock, TestMessagingStream.TEST_STREAM, [
        { messageId: '1-0', event: makeTestEvent(TestEventId.DEFAULT) },
        { messageId: '2-0', event: makeTestEvent(TestEventId.DEFAULT) },
      ]);

      await processor.start();
      await waitFor(() => meter.counterTotal(RETRY_ATTEMPTS) === 2);

      expect(meter.counterTotal(PROCESSED)).toBe(0);
    });
  });
});
