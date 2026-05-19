import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import type { Redis } from 'ioredis';
import { createMock } from '@volontariapp/testing';
import os from 'node:os';
import v8 from 'node:v8';
import type { ParseResult } from '../../../types/index.js';
import {
  TestMessagingStream,
  TestMessagingGroup,
  TestMessagingConsumer,
  mockRedisCall,
  TestBasePostProcessor,
} from '../../utils/index.js';

describe('BasePostProcessor — Unit', () => {
  let redisMock: jest.Mocked<Redis>;
  let processor: TestBasePostProcessor;
  let callMock: ReturnType<typeof mockRedisCall>;

  beforeEach(() => {
    jest.clearAllMocks();
    redisMock = createMock<Redis>();
    callMock = mockRedisCall(redisMock);

    processor = new TestBasePostProcessor(redisMock, {
      streamName: TestMessagingStream.TEST_STREAM,
      groupName: TestMessagingGroup.TEST_GROUP,
      consumerName: TestMessagingConsumer.TEST_CONSUMER,
      claimIntervalMs: 50,
      claimMinIdleTimeMs: 100,
    });
  });

  afterEach(async () => {
    if (processor.getIsRunning()) {
      await processor.stop();
    }
    jest.restoreAllMocks();
  });

  describe('Constructor Validations', () => {
    it('should throw error if redis.call is not a function', () => {
      const invalidRedis = createMock<Redis>();
      Reflect.deleteProperty(invalidRedis, 'call');

      expect(() => {
        new TestBasePostProcessor(invalidRedis, {
          streamName: TestMessagingStream.TEST_STREAM,
          groupName: TestMessagingGroup.TEST_GROUP,
        });
      }).toThrow('Invalid Redis instance: must support .call command execution');
    });

    it('should configure option defaults correctly', () => {
      const p = new TestBasePostProcessor(redisMock, {
        streamName: TestMessagingStream.TEST_STREAM,
        groupName: TestMessagingGroup.TEST_GROUP,
      });

      const options = p.getOptions();
      expect(options.batchSize).toBe(10);
      expect(options.blockMs).toBe(2000);
      expect(options.claimIntervalMs).toBe(30000);
      expect(options.claimMinIdleTimeMs).toBe(60000);
      expect(options.idempotencyTtlSeconds).toBe(86400);
      expect(options.retry.enableDlq).toBe(true);
      expect(options.dynamicBatching.enabled).toBe(false);
    });
  });

  describe('start/stop Lifecycle', () => {
    it('should set isRunning to true on start and false on stop', async () => {
      expect(processor.getIsRunning()).toBe(false);
      await processor.start();
      expect(processor.getIsRunning()).toBe(true);
      await processor.stop();
      expect(processor.getIsRunning()).toBe(false);
    });

    it('should exit early on start if already running', async () => {
      await processor.start();
      const loggerWarnSpy = jest.spyOn(processor.getLogger(), 'warn');
      await processor.start();
      expect(loggerWarnSpy).toHaveBeenCalledWith('Post-processor is already running');
    });

    it('should fail start if ensureConsumerGroup throws connection error', async () => {
      const connError = new Error('Redis connection lost');
      callMock.mockRejectedValue(connError);

      await expect(processor.start()).rejects.toThrow(connError);
      expect(processor.getIsRunning()).toBe(false);
    });

    it('should catch loop crashes and update running status', async () => {
      // Force loop to crash immediately by making isAllowed throw
      jest.spyOn(processor.getCircuitBreaker(), 'isAllowed').mockImplementation(() => {
        throw new Error('Immediate crash');
      });

      const loggerErrorSpy = jest.spyOn(processor.getLogger(), 'error');

      await processor.start();
      // Wait for loop promise to resolve / reject in background
      await new Promise((resolve) => setTimeout(resolve, 20));

      expect(processor.getIsRunning()).toBe(false);
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'Post-processor loop crashed',
        expect.any(Object),
      );
    });

    it('should exit early on stop if already stopped', async () => {
      const loggerInfoSpy = jest.spyOn(processor.getLogger(), 'info');
      await processor.stop();
      expect(loggerInfoSpy).not.toHaveBeenCalledWith('Stopping post-processor...');
    });
  });

  describe('Resilience & Redis Availability in Consumption Loop', () => {
    it('should continue loop when Redis call (XREADGROUP) throws connection/timeout error', async () => {
      let xreadCount = 0;
      const connectionError = new Error('Connection timed out');

      callMock.mockImplementation(async (command: string, ..._args: (string | number)[]) => {
        if (command === 'XGROUP') return 'OK';
        if (command === 'XREADGROUP') {
          xreadCount++;
          await new Promise<void>((resolve) => setImmediate(resolve));
          if (xreadCount === 1) {
            // First time: throw connection error
            throw connectionError;
          }
          // Second time: return empty list to simulate normal operation
          return [];
        }
        return null;
      });

      const loggerErrorSpy = jest.spyOn(processor.getLogger(), 'error');

      await processor.start();
      // Let it run through a couple cycles (including the wait times)
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'Error in post-processor consumption cycle',
        expect.objectContaining({ error: connectionError }),
      );
      // Verify that loop continued and called XREADGROUP again
      expect(xreadCount).toBeGreaterThanOrEqual(2);
      expect(processor.getIsRunning()).toBe(true);
    });

    it('should continue loop if processEntries throws error', async () => {
      callMock.mockImplementation(async (command: string, ..._args: (string | number)[]) => {
        if (command === 'XGROUP') return 'OK';
        if (command === 'XREADGROUP') {
          await new Promise<void>((resolve) => setImmediate(resolve));
          return [
            [
              TestMessagingStream.TEST_STREAM,
              [['1-0', ['id', 'evt-1', 'type', 'event.changed', 'event', '{}']]],
            ],
          ];
        }
        return null;
      });

      const processingError = new Error('Processing failed');
      processor.processError = processingError;

      const loggerErrorSpy = jest.spyOn(processor.getLogger(), 'error');

      await processor.start();
      await new Promise((resolve) => setTimeout(resolve, 30));

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'Error in post-processor consumption cycle',
        expect.objectContaining({ error: processingError }),
      );
      expect(processor.getIsRunning()).toBe(true);
    });

    it('should handle raw entries result being null/empty gracefully', async () => {
      callMock.mockImplementation(async (command: string, ..._args: (string | number)[]) => {
        if (command === 'XGROUP') return 'OK';
        if (command === 'XREADGROUP') {
          await new Promise<void>((resolve) => setImmediate(resolve));
          return null; // simulate null return
        }
        return null;
      });

      const loggerWarnSpy = jest.spyOn(processor.getLogger(), 'warn');

      await processor.start();
      await new Promise((resolve) => setTimeout(resolve, 30));

      expect(loggerWarnSpy).toHaveBeenCalledWith('No raw entries received', expect.any(Object));
      expect(processor.getIsRunning()).toBe(true);
    });
  });

  describe('Error Handling in Background Loops', () => {
    it('should catch and log error if claimPendingMessages fails due to Redis unavailable', async () => {
      // Mock getPendingMessages to throw error by throwing on XPENDING
      callMock.mockImplementation(async (command: string, ..._args: (string | number)[]) => {
        await Promise.resolve();
        if (command === 'XGROUP') return 'OK';
        if (command === 'XPENDING') {
          throw new Error('Redis connection lost');
        }
        return [];
      });

      const loggerErrorSpy = jest.spyOn(processor.getLogger(), 'error');

      await processor.start();
      // Wait for claimIntervalMs (50ms) to trigger claim loop
      await new Promise((resolve) => setTimeout(resolve, 80));

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'Failed claiming pending messages',
        expect.objectContaining({ error: new Error('Redis connection lost') }),
      );
      // Verify claim timeout is scheduled again
      expect(processor.getClaimTimeout()).not.toBeNull();
    });

    it('should catch and log error if processRetryQueue fails due to Redis unavailable', async () => {
      // Mock getReadyForRetry to throw error by throwing on ZRANGEBYSCORE
      callMock.mockImplementation(async (command: string, ..._args: (string | number)[]) => {
        await Promise.resolve();
        if (command === 'XGROUP') return 'OK';
        if (command === 'ZRANGEBYSCORE') {
          throw new Error('Redis connection lost');
        }
        return [];
      });

      const loggerErrorSpy = jest.spyOn(processor.getLogger(), 'error');

      await processor.start();
      // Wait for retry loop (50ms) to trigger
      await new Promise((resolve) => setTimeout(resolve, 80));

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'Failed processing retry queue',
        expect.objectContaining({ error: new Error('Redis connection lost') }),
      );
      expect(processor.getRetryLoopTimeout()).not.toBeNull();
    });

    it('should catch and log error if syncDlqRetention fails due to Redis unavailable', async () => {
      const p = new TestBasePostProcessor(redisMock, {
        streamName: TestMessagingStream.TEST_STREAM,
        groupName: TestMessagingGroup.TEST_GROUP,
        consumerName: TestMessagingConsumer.TEST_CONSUMER,
        claimIntervalMs: 5, // very short for faster test
        retry: {
          enableDlq: true,
        },
      });

      // Mock xrange command used in DLQ sync to fail
      callMock.mockImplementation(async (command: string, ..._args: (string | number)[]) => {
        await Promise.resolve();
        if (command === 'XGROUP') return 'OK';
        if (command === 'XRANGE') {
          throw new Error('Redis connection lost');
        }
        return [];
      });

      const loggerErrorSpy = jest.spyOn(p.getLogger(), 'error');

      await p.start();
      // Wait for DLQ sync interval (claimIntervalMs * 10 = 50ms)
      await new Promise((resolve) => setTimeout(resolve, 80));

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'Failed to clean DLQ',
        expect.objectContaining({ error: new Error('Redis connection lost') }),
      );
      expect(p.getDlqSyncTimeout()).not.toBeNull();

      await p.stop();
    });
  });

  describe('Error Handling in acknowledge and sendMessageToDlq', () => {
    it('should catch and log error if acknowledge fails', async () => {
      // Force XACK call to throw
      callMock.mockImplementation(async (command: string, ..._args: (string | number)[]) => {
        await Promise.resolve();
        if (command === 'XACK') {
          throw new Error('XACK failed');
        }
        return null;
      });

      const loggerErrorSpy = jest.spyOn(processor.getLogger(), 'error');

      await processor.testAcknowledge('1-0');
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'Failed to acknowledge message',
        expect.objectContaining({ messageId: '1-0', error: new Error('XACK failed') }),
      );
    });

    it('should catch and log error if sendMessageToDlq fails', async () => {
      // Mock redis.xadd to reject
      redisMock.xadd.mockRejectedValue(new Error('DLQ write failed'));

      const loggerErrorSpy = jest.spyOn(processor.getLogger(), 'error');

      const mockPayload: ParseResult = {
        success: true,
        id: 'evt-123',
        type: 'event.changed',
        payload: JSON.stringify({ success: true }),
      };
      await processor.testSendMessageToDlq('1-0', mockPayload, 'Some processing error');

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'Failed to send message to DLQ',
        expect.objectContaining({ messageId: '1-0', error: new Error('DLQ write failed') }),
      );
    });
  });

  describe('Dynamic Batching Adjustments', () => {
    let heapSpy: jest.SpiedFunction<typeof v8.getHeapStatistics>;
    let loadSpy: jest.SpiedFunction<typeof os.loadavg>;
    let cpuSpy: jest.SpiedFunction<typeof os.cpus>;

    beforeEach(() => {
      heapSpy = jest.spyOn(v8, 'getHeapStatistics');
      loadSpy = jest.spyOn(os, 'loadavg');
      cpuSpy = jest.spyOn(os, 'cpus');

      // Set standard healthy conditions by default
      const mockHeapStats = {
        used_heap_size: 50 * 1024 * 1024,
        heap_size_limit: 100 * 1024 * 1024,
      } as object as v8.HeapInfo;
      heapSpy.mockReturnValue(mockHeapStats);
      loadSpy.mockReturnValue([0.5, 0.5, 0.5]);

      const mockCpu: os.CpuInfo = {
        model: 'Mock CPU',
        speed: 2500,
        times: { user: 0, nice: 0, sys: 0, idle: 0, irq: 0 },
      };
      cpuSpy.mockReturnValue([mockCpu, mockCpu, mockCpu, mockCpu]); // 4 CPUs
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should not adjust batch size if dynamic batching is disabled', () => {
      const p = new TestBasePostProcessor(redisMock, {
        streamName: TestMessagingStream.TEST_STREAM,
        groupName: TestMessagingGroup.TEST_GROUP,
        batchSize: 10,
        dynamicBatching: { enabled: false },
      });

      p.triggerAdjustBatchSize(500);
      expect(p.getBatchSize()).toBe(10);
    });

    it('should drop batch size to minBatchSize if memory pressure is high (>85%)', () => {
      const p = new TestBasePostProcessor(redisMock, {
        streamName: TestMessagingStream.TEST_STREAM,
        groupName: TestMessagingGroup.TEST_GROUP,
        batchSize: 50,
        dynamicBatching: {
          enabled: true,
          minBatchSize: 2,
          maxBatchSize: 100,
        },
      });

      // Mock high memory pressure (90%)
      const mockHeapStats = {
        used_heap_size: 90 * 1024 * 1024,
        heap_size_limit: 100 * 1024 * 1024,
      } as object as v8.HeapInfo;
      heapSpy.mockReturnValue(mockHeapStats);

      p.triggerAdjustBatchSize(100);
      expect(p.getBatchSize()).toBe(2);
    });

    it('should reduce batch size by 30% if CPU pressure is high (>1.2)', () => {
      const p = new TestBasePostProcessor(redisMock, {
        streamName: TestMessagingStream.TEST_STREAM,
        groupName: TestMessagingGroup.TEST_GROUP,
        batchSize: 20,
        dynamicBatching: {
          enabled: true,
          minBatchSize: 2,
          maxBatchSize: 50,
        },
      });
      p.setBatchSize(20);

      // Mock high CPU pressure (6 load on 4 cores = 1.5 > 1.2)
      loadSpy.mockReturnValue([6.0, 5.0, 5.0]);
      const mockCpu: os.CpuInfo = {
        model: 'Mock CPU',
        speed: 2500,
        times: { user: 0, nice: 0, sys: 0, idle: 0, irq: 0 },
      };
      cpuSpy.mockReturnValue([mockCpu, mockCpu, mockCpu, mockCpu]);

      p.triggerAdjustBatchSize(100);
      expect(p.getBatchSize()).toBe(14); // 20 * 0.7 = 14
    });

    it('should reduce batch size by 20% if latency is greater than target latency', () => {
      const p = new TestBasePostProcessor(redisMock, {
        streamName: TestMessagingStream.TEST_STREAM,
        groupName: TestMessagingGroup.TEST_GROUP,
        batchSize: 20,
        dynamicBatching: {
          enabled: true,
          minBatchSize: 5,
          maxBatchSize: 50,
          targetLatencyMs: 1000,
        },
      });
      p.setBatchSize(20);

      // Latency is 1500ms > 1000ms target
      p.triggerAdjustBatchSize(1500);
      expect(p.getBatchSize()).toBe(16); // 20 * 0.8 = 16
    });

    it('should increase batch size by 1 if latency is less than target latency', () => {
      const p = new TestBasePostProcessor(redisMock, {
        streamName: TestMessagingStream.TEST_STREAM,
        groupName: TestMessagingGroup.TEST_GROUP,
        batchSize: 20,
        dynamicBatching: {
          enabled: true,
          minBatchSize: 5,
          maxBatchSize: 50,
          targetLatencyMs: 1000,
        },
      });
      p.setBatchSize(20);

      // Latency is 500ms < 1000ms target
      p.triggerAdjustBatchSize(500);
      expect(p.getBatchSize()).toBe(21);
    });

    it('should not increase batch size beyond maxBatchSize', () => {
      const p = new TestBasePostProcessor(redisMock, {
        streamName: TestMessagingStream.TEST_STREAM,
        groupName: TestMessagingGroup.TEST_GROUP,
        batchSize: 20,
        dynamicBatching: {
          enabled: true,
          minBatchSize: 5,
          maxBatchSize: 20,
          targetLatencyMs: 1000,
        },
      });
      p.setBatchSize(20);

      p.triggerAdjustBatchSize(500);
      expect(p.getBatchSize()).toBe(20); // capped at maxBatchSize (20)
    });
  });

  describe('Signal Handling & Graceful Shutdown', () => {
    it('should register listeners on start and call stop on SIGTERM', async () => {
      const signalHandlers: Record<string, (() => void) | undefined> = {};
      const onSpy = jest.spyOn(process, 'on').mockImplementation((signal, handler) => {
        signalHandlers[signal as string] = handler as () => void;
        return process;
      });
      const offSpy = jest.spyOn(process, 'off').mockImplementation((signal, _handler) => {
        Reflect.deleteProperty(signalHandlers, signal as string);
        return process;
      });

      await processor.start();

      expect(onSpy).toHaveBeenCalledWith('SIGTERM', expect.any(Function));
      expect(onSpy).toHaveBeenCalledWith('SIGINT', expect.any(Function));

      const stopSpy = jest.spyOn(processor, 'stop');

      // Trigger the intercepted SIGTERM handler
      expect(signalHandlers['SIGTERM']).toBeDefined();
      const handler = signalHandlers['SIGTERM'];
      if (handler) {
        handler();
      }

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(stopSpy).toHaveBeenCalled();
      expect(processor.getIsRunning()).toBe(false);
      expect(offSpy).toHaveBeenCalledWith('SIGTERM', expect.any(Function));
      expect(offSpy).toHaveBeenCalledWith('SIGINT', expect.any(Function));
    });

    it('should log error if shutdown throws during signal handler execution', async () => {
      const signalHandlers: Record<string, (() => void) | undefined> = {};
      jest.spyOn(process, 'on').mockImplementation((signal, handler) => {
        signalHandlers[signal as string] = handler as () => void;
        return process;
      });

      await processor.start();

      const stopError = new Error('Stop failed');
      jest.spyOn(processor, 'stop').mockRejectedValue(stopError);
      const loggerErrorSpy = jest.spyOn(processor.getLogger(), 'error');

      // Trigger the SIGINT handler
      expect(signalHandlers['SIGINT']).toBeDefined();
      const handler = signalHandlers['SIGINT'];
      if (handler) {
        handler();
      }

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'Error during graceful shutdown',
        expect.objectContaining({ error: stopError }),
      );
    });
  });
});
