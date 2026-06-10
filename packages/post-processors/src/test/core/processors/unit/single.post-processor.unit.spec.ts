import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { EventMessagingType } from '@volontariapp/messaging';
import type { Redis } from 'ioredis';
import { createMock } from '@volontariapp/testing';
import { CircuitBreakerState } from '../../../../enums/circuit-breaker-state.enum.js';
import {
  TestPostProcessor,
  makeTestEvent,
  TestMessagingStream,
  TestMessagingGroup,
  TestMessagingConsumer,
  TestEventId,
  mockRedisCall,
  mockRedisXreadgroup,
  formatEventsToXreadgroupResponse,
} from '../../../utils/index.js';

describe('SinglePostProcessor — Unit', () => {
  let redisMock: jest.Mocked<Redis>;
  let processor: TestPostProcessor;
  let callMock: ReturnType<typeof mockRedisCall>;

  beforeEach(() => {
    jest.clearAllMocks();
    redisMock = createMock<Redis>();
    redisMock.duplicate.mockReturnValue(redisMock);
    callMock = mockRedisCall(redisMock);

    processor = new TestPostProcessor(redisMock, {
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

  describe('start/stop', () => {
    it('should ensure consumer group on start', async () => {
      await processor.start();
      const xgroupCalls = callMock.mock.calls.filter((c) => c[0] === 'XGROUP');
      expect(xgroupCalls).toHaveLength(1);
      expect(xgroupCalls[0]).toEqual([
        'XGROUP',
        'CREATE',
        TestMessagingStream.TEST_STREAM,
        TestMessagingGroup.TEST_GROUP,
        '0',
        'MKSTREAM',
      ]);
    });

    it('should ignore BUSYGROUP error', async () => {
      callMock.mockImplementation(async (command: string, ..._args: (string | number)[]) => {
        if (command === 'XGROUP') {
          throw new Error('BUSYGROUP Consumer Group name already exists');
        }
        if (command === 'XREADGROUP') {
          await new Promise((resolve) => setTimeout(resolve, 50));
          return [];
        }
        return [];
      });
      await expect(processor.start()).resolves.toBeUndefined();
    });

    it('should throw other group creation errors', async () => {
      const error = new Error('Some connection error');
      callMock.mockImplementation(async (command: string, ..._args: (string | number)[]) => {
        if (command === 'XGROUP') {
          throw error;
        }
        if (command === 'XREADGROUP') {
          await new Promise((resolve) => setTimeout(resolve, 50));
          return [];
        }
        return [];
      });
      await expect(processor.start()).rejects.toThrow(error);
    });
  });

  describe('runLoop & processing', () => {
    it('should read pending messages and then new messages', async () => {
      const mockEvent = makeTestEvent(TestEventId.DEFAULT);

      mockRedisXreadgroup(callMock, TestMessagingStream.TEST_STREAM, [
        { messageId: TestEventId.MSG_PENDING, event: mockEvent },
      ]);

      const processSpy = jest.spyOn(processor, 'processEvent');
      const shouldProcessSpy = jest.spyOn(processor, 'shouldProcess');
      const acknowledgeSpy = jest.spyOn(processor, 'acknowledge');

      await processor.start();
      await new Promise((resolve) => setTimeout(resolve, 60));

      expect(processSpy).toHaveBeenCalledTimes(1);
      expect(shouldProcessSpy).toHaveBeenCalledWith(EventMessagingType.EVENT_CREATED);
      expect(acknowledgeSpy).toHaveBeenCalledWith(TestEventId.MSG_PENDING);

      const xreadgroupCalls = callMock.mock.calls.filter((c) => c[0] === 'XREADGROUP');
      expect(xreadgroupCalls.length).toBeGreaterThanOrEqual(1);
      expect(xreadgroupCalls[0]).toEqual([
        'XREADGROUP',
        'GROUP',
        TestMessagingGroup.TEST_GROUP,
        TestMessagingConsumer.TEST_CONSUMER,
        'COUNT',
        10,
        'STREAMS',
        TestMessagingStream.TEST_STREAM,
        '0',
      ]);
    });

    it('should not acknowledge if processEvent throws', async () => {
      const mockEvent = makeTestEvent(TestEventId.DEFAULT);

      mockRedisXreadgroup(callMock, TestMessagingStream.TEST_STREAM, [
        { messageId: TestEventId.MSG_PENDING, event: mockEvent },
      ]);

      const processSpy = jest.spyOn(processor, 'processEvent');
      const acknowledgeSpy = jest.spyOn(processor, 'acknowledge');
      processor.processError = new Error('Process failed');

      await processor.start();
      await new Promise((resolve) => setTimeout(resolve, 60));

      expect(processSpy).toHaveBeenCalledTimes(1);
      expect(acknowledgeSpy).not.toHaveBeenCalled();
    });

    it('should skip messages with unregistered types', async () => {
      const mockEvent = makeTestEvent(TestEventId.DEFAULT);
      const unregisteredEvent = {
        ...mockEvent,
        type: 'unregistered.type' as unknown as EventMessagingType,
      };

      mockRedisXreadgroup(callMock, TestMessagingStream.TEST_STREAM, [
        { messageId: TestEventId.MSG_PENDING, event: unregisteredEvent },
      ]);

      const processSpy = jest.spyOn(processor, 'processEvent');
      const shouldProcessSpy = jest.spyOn(processor, 'shouldProcess');
      const acknowledgeSpy = jest.spyOn(processor, 'acknowledge');
      processor.shouldProcessVal = false;

      await processor.start();
      await new Promise((resolve) => setTimeout(resolve, 60));

      expect(processSpy).not.toHaveBeenCalled();
      expect(shouldProcessSpy).toHaveBeenCalledWith(
        'unregistered.type' as unknown as EventMessagingType,
      );
      expect(acknowledgeSpy).toHaveBeenCalledWith(TestEventId.MSG_PENDING);
    });
  });

  describe('Idempotence Locks', () => {
    it('should acquire lock and skip if already processing (concurrent safety)', async () => {
      const mockEvent = makeTestEvent(TestEventId.DEFAULT);

      let xreadCount = 0;
      callMock.mockImplementation(async (command: string, ..._args: (string | number)[]) => {
        if (command === 'XGROUP') return 'OK';
        if (command === 'XREADGROUP') {
          xreadCount++;
          if (xreadCount === 1) {
            return formatEventsToXreadgroupResponse(TestMessagingStream.TEST_STREAM, [
              { messageId: TestEventId.MSG_PENDING, event: mockEvent },
            ]);
          }
          await new Promise((resolve) => setTimeout(resolve, 50));
          return [];
        }
        if (command === 'SET') {
          return null; // lock acquisition fails (NX)
        }
        if (command === 'XACK') {
          return 1;
        }
        return [];
      });

      const processSpy = jest.spyOn(processor, 'processEvent');
      const acknowledgeSpy = jest.spyOn(processor, 'acknowledge');

      await processor.start();
      await new Promise((resolve) => setTimeout(resolve, 60));

      // Should skip processing and directly XACK the duplicate (since it was locked by another process)
      expect(processSpy).not.toHaveBeenCalled();
      expect(acknowledgeSpy).toHaveBeenCalledWith(TestEventId.MSG_PENDING);
    });
  });

  describe('Circuit Breaker Integration', () => {
    it('should transition to OPEN state on consecutive failures and halt message processing', async () => {
      const mockEvent = makeTestEvent(TestEventId.DEFAULT);

      let xreadgroupCount = 0;
      callMock.mockImplementation(async (command: string, ..._args: (string | number)[]) => {
        if (command === 'XGROUP') return 'OK';
        if (command === 'XREADGROUP') {
          xreadgroupCount++;
          if (xreadgroupCount <= 3) {
            return formatEventsToXreadgroupResponse(TestMessagingStream.TEST_STREAM, [
              { messageId: TestEventId.MSG_PENDING, event: mockEvent },
            ]);
          }
          await new Promise((resolve) => setTimeout(resolve, 50));
          return [];
        }
        if (command === 'SET') return 'OK';
        return [];
      });

      // Fail every attempt
      processor.processError = new Error('Database down');

      const processSpy = jest.spyOn(processor, 'processEvent');
      await processor.start();

      // Give it time to attempt processing multiple times
      await new Promise((resolve) => setTimeout(resolve, 300));

      const diag = processor.getCircuitBreaker().getDiagnostics();
      expect(diag.state).toBe(CircuitBreakerState.OPEN);
      expect(diag.failureCount).toBeGreaterThanOrEqual(3);

      // Verify that after opening, processing attempts stop
      const callsBefore = processSpy.mock.calls.length;
      await new Promise((resolve) => setTimeout(resolve, 100));
      const callsAfter = processSpy.mock.calls.length;
      expect(callsAfter).toBe(callsBefore);
    });
  });

  describe('Retry and DLQ Fallback', () => {
    it('should schedule for retry when processEvent throws a transient error', async () => {
      const mockEvent = makeTestEvent(TestEventId.DEFAULT);
      mockRedisXreadgroup(callMock, TestMessagingStream.TEST_STREAM, [
        { messageId: TestEventId.MSG_PENDING, event: mockEvent },
      ]);

      const zaddSpy = jest.spyOn(redisMock, 'zadd');
      const incrSpy = jest.spyOn(redisMock, 'incr');

      processor.processError = new Error('Transient error');
      await processor.start();
      await new Promise((resolve) => setTimeout(resolve, 60));

      // Should call redis incr to track retry attempts
      expect(incrSpy.mock.calls.length).toBeGreaterThanOrEqual(1);
      expect(incrSpy.mock.calls[0]?.[0]).toBe(
        `retry:post-processor:${TestMessagingGroup.TEST_GROUP}:${TestEventId.MSG_PENDING}:attempt`,
      );

      // Should add message ID to sorted retry queue
      expect(zaddSpy.mock.calls.length).toBeGreaterThanOrEqual(1);
      expect(zaddSpy.mock.calls[0]?.[0]).toBe(
        `retry-queue:post-processor:${TestMessagingGroup.TEST_GROUP}`,
      );
      expect(zaddSpy.mock.calls[0]?.[2]).toBe(TestEventId.MSG_PENDING);
    });
  });
});
