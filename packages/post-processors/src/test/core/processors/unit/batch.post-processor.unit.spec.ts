import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import type { Redis, ChainableCommander } from 'ioredis';
import { createMock } from '@volontariapp/testing';
import os from 'node:os';
import v8 from 'node:v8';
import { CircuitBreakerState } from '../../../../enums/circuit-breaker-state.enum.js';
import {
  TestBatchPostProcessor,
  makeTestEvent,
  TestMessagingStream,
  TestMessagingGroup,
  TestMessagingConsumer,
  mockRedisCall,
  mockRedisXreadgroup,
  formatEventsToXreadgroupResponse,
} from '../../../utils/index.js';

describe('BatchPostProcessor — Unit', () => {
  let redisMock: jest.Mocked<Redis>;
  let processor: TestBatchPostProcessor;
  let callMock: ReturnType<typeof mockRedisCall>;

  beforeEach(() => {
    jest.clearAllMocks();
    redisMock = createMock<Redis>();
    const pipelineMock = createMock<ChainableCommander>();
    pipelineMock.del.mockReturnThis();
    pipelineMock.zrem.mockReturnThis();
    pipelineMock.exec.mockResolvedValue([]);
    redisMock.pipeline.mockReturnValue(pipelineMock);
    callMock = mockRedisCall(redisMock);

    processor = new TestBatchPostProcessor(redisMock, {
      streamName: TestMessagingStream.TEST_STREAM,
      groupName: TestMessagingGroup.TEST_GROUP,
      consumerName: TestMessagingConsumer.TEST_CONSUMER,
      claimIntervalMs: 50,
      claimMinIdleTimeMs: 100,
      circuitBreaker: {
        failureThreshold: 3,
        resetTimeoutMs: 1000,
        successThreshold: 1,
      },
    });
  });

  afterEach(async () => {
    await processor.stop();
  });

  describe('runLoop in batch', () => {
    it('should read multiple pending messages and process them as a single batch', async () => {
      const mockEvent1 = makeTestEvent('evt-1');
      const mockEvent2 = makeTestEvent('evt-2');

      mockRedisXreadgroup(callMock, TestMessagingStream.TEST_STREAM, [
        { messageId: '1-0', event: mockEvent1 },
        { messageId: '2-0', event: mockEvent2 },
      ]);

      const processSpy = jest.spyOn(processor, 'processEvents');

      await processor.start();
      await new Promise((resolve) => setTimeout(resolve, 60));

      expect(processSpy).toHaveBeenCalledTimes(1);
      expect(processSpy).toHaveBeenCalledWith([
        expect.objectContaining({
          event: expect.objectContaining({ id: 'evt-1' }),
          messageId: '1-0',
        }),
        expect.objectContaining({
          event: expect.objectContaining({ id: 'evt-2' }),
          messageId: '2-0',
        }),
      ]);

      const xackCalls = callMock.mock.calls.filter((c) => c[0] === 'XACK');
      expect(xackCalls).toHaveLength(1);
      expect(xackCalls[0]).toEqual([
        'XACK',
        TestMessagingStream.TEST_STREAM,
        TestMessagingGroup.TEST_GROUP,
        '1-0',
        '2-0',
      ]);
    });

    it('should not acknowledge batch if processEvents throws an error', async () => {
      const mockEvent = makeTestEvent('evt-1');

      mockRedisXreadgroup(callMock, TestMessagingStream.TEST_STREAM, [
        { messageId: '1-0', event: mockEvent },
      ]);

      const processSpy = jest.spyOn(processor, 'processEvents');
      processor.processError = new Error('Batch processing failed');

      await processor.start();
      await new Promise((resolve) => setTimeout(resolve, 60));

      expect(processSpy).toHaveBeenCalledTimes(1);
      const xackCalls = callMock.mock.calls.filter((c) => c[0] === 'XACK');
      expect(xackCalls).toHaveLength(0);
    });
  });

  describe('Batch Retry & DLQ', () => {
    it('should individually schedule batch items for retry when batch execution fails', async () => {
      const mockEvent1 = makeTestEvent('evt-1');
      const mockEvent2 = makeTestEvent('evt-2');

      mockRedisXreadgroup(callMock, TestMessagingStream.TEST_STREAM, [
        { messageId: '1-0', event: mockEvent1 },
        { messageId: '2-0', event: mockEvent2 },
      ]);

      const zaddSpy = jest.spyOn(redisMock, 'zadd');
      const incrSpy = jest.spyOn(redisMock, 'incr');

      processor.processError = new Error('Database connection failed');
      await processor.start();
      await new Promise((resolve) => setTimeout(resolve, 60));

      // Should increment retry counts for each item in the batch
      const incrCalls = incrSpy.mock.calls;
      expect(incrCalls.length).toBeGreaterThanOrEqual(2);
      expect(incrCalls.some((c) => c[0].includes('1-0:attempt'))).toBe(true);
      expect(incrCalls.some((c) => c[0].includes('2-0:attempt'))).toBe(true);

      // Should add both items to the retry queue
      const zaddCalls = zaddSpy.mock.calls;
      expect(zaddCalls.length).toBeGreaterThanOrEqual(2);
      expect(zaddCalls.some((c) => String(c[2]) === '1-0')).toBe(true);
      expect(zaddCalls.some((c) => String(c[2]) === '2-0')).toBe(true);
    });
  });

  describe('Dynamic Batching', () => {
    it('should reduce batch size under high memory pressure', async () => {
      const mockEvent = makeTestEvent('evt-1');
      mockRedisXreadgroup(callMock, TestMessagingStream.TEST_STREAM, [
        { messageId: '1-0', event: mockEvent },
      ]);

      const heapSpy = jest.spyOn(v8, 'getHeapStatistics').mockReturnValue({
        total_heap_size: 100,
        total_heap_size_executable: 0,
        total_physical_size: 100,
        total_available_size: 100,
        used_heap_size: 90,
        heap_size_limit: 100, // 90% memory pressure (> 85%)
        malloced_memory: 0,
        peak_malloced_memory: 0,
        does_zap_garbage: 0,
        external_memory: 0,
        total_global_handles_size: 0,
        used_global_handles_size: 0,
        number_of_native_contexts: 0,
        number_of_detached_contexts: 0,
      });

      processor = new TestBatchPostProcessor(redisMock, {
        streamName: TestMessagingStream.TEST_STREAM,
        groupName: TestMessagingGroup.TEST_GROUP,
        consumerName: TestMessagingConsumer.TEST_CONSUMER,
        batchSize: 10,
        dynamicBatching: {
          enabled: true,
          minBatchSize: 2,
          maxBatchSize: 10,
          targetLatencyMs: 100,
        },
      });

      await processor.start();
      await new Promise((resolve) => setTimeout(resolve, 60));

      expect(processor.getCurrentBatchSize()).toBe(2); // Reduced to minBatchSize
      heapSpy.mockRestore();
    });

    it('should reduce batch size under high CPU pressure', async () => {
      const mockEvent = makeTestEvent('evt-1');
      mockRedisXreadgroup(callMock, TestMessagingStream.TEST_STREAM, [
        { messageId: '1-0', event: mockEvent },
      ]);

      const loadSpy = jest.spyOn(os, 'loadavg').mockReturnValue([5.0, 0, 0]);
      const cpusSpy = jest.spyOn(os, 'cpus').mockReturnValue([{} as os.CpuInfo]); // 1 core => CPU load = 5.0 (> 1.2)

      processor = new TestBatchPostProcessor(redisMock, {
        streamName: TestMessagingStream.TEST_STREAM,
        groupName: TestMessagingGroup.TEST_GROUP,
        consumerName: TestMessagingConsumer.TEST_CONSUMER,
        batchSize: 10,
        dynamicBatching: {
          enabled: true,
          minBatchSize: 2,
          maxBatchSize: 10,
          targetLatencyMs: 100,
        },
      });

      await processor.start();
      await new Promise((resolve) => setTimeout(resolve, 60));

      expect(processor.getCurrentBatchSize()).toBe(7); // Math.max(2, Math.floor(10 * 0.7)) = 7
      loadSpy.mockRestore();
      cpusSpy.mockRestore();
    });

    it('should adjust batch size based on execution latency', async () => {
      const mockEvent = makeTestEvent('evt-1');
      mockRedisXreadgroup(callMock, TestMessagingStream.TEST_STREAM, [
        { messageId: '1-0', event: mockEvent },
      ]);

      // Mock Date.now to simulate a slow execution (e.g. 500ms latency > 100ms target)
      let timeCount = 0;
      const dateSpy = jest.spyOn(Date, 'now').mockImplementation(() => {
        timeCount++;
        if (timeCount === 1) return 1000; // startTime
        return 1500; // endTime => 500ms latency
      });

      processor = new TestBatchPostProcessor(redisMock, {
        streamName: TestMessagingStream.TEST_STREAM,
        groupName: TestMessagingGroup.TEST_GROUP,
        consumerName: TestMessagingConsumer.TEST_CONSUMER,
        batchSize: 10,
        dynamicBatching: {
          enabled: true,
          minBatchSize: 3,
          maxBatchSize: 10,
          targetLatencyMs: 100,
        },
      });

      await processor.start();
      await new Promise((resolve) => setTimeout(resolve, 60));

      expect(processor.getCurrentBatchSize()).toBe(8); // Math.max(3, Math.floor(10 * 0.8)) = 8
      dateSpy.mockRestore();
    });
  });

  describe('Circuit Breaker Integration', () => {
    it('should trip circuit breaker to OPEN on consecutive failed batch cycles', async () => {
      const mockEvent = makeTestEvent('evt-1');

      let xreadgroupCount = 0;
      callMock.mockImplementation(async (command: string, ..._args: (string | number)[]) => {
        if (command === 'XGROUP') return 'OK';
        if (command === 'XREADGROUP') {
          xreadgroupCount++;
          if (xreadgroupCount <= 3) {
            return formatEventsToXreadgroupResponse(TestMessagingStream.TEST_STREAM, [
              { messageId: '1-0', event: mockEvent },
            ]);
          }
          await new Promise((resolve) => setTimeout(resolve, 50));
          return [];
        }
        if (command === 'SET') return 'OK';
        return [];
      });

      processor.processError = new Error('External service timeout');
      await processor.start();
      await new Promise((resolve) => setTimeout(resolve, 300));

      const diag = processor.getCircuitBreaker().getDiagnostics();
      expect(diag.state).toBe(CircuitBreakerState.OPEN);
      expect(diag.failureCount).toBeGreaterThanOrEqual(3);
    });
  });
});
