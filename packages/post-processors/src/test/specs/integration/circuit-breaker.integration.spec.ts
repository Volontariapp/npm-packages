import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import type { Redis } from 'ioredis';
import { createMock } from '@volontariapp/testing';
import { TestPostProcessor } from '../../utils/classes/test-post-processor.class.js';
import { mockRedisCall, mockRedisXreadgroup } from '../../utils/mocks/redis-call.mock.js';
import type { RedisMockCallReturn } from '../../utils/mocks/redis-call.mock.js';
import { makeTestEvent } from '../../utils/factories/test-event.factory.js';
import { CircuitBreakerState } from '../../../enums/circuit-breaker-state.enum.js';
import {
  TestMessagingStream,
  TestMessagingGroup,
  TestMessagingConsumer,
} from '../../utils/enums/test-messaging.enum.js';

describe('CircuitBreaker Integration', () => {
  let redisMock: jest.Mocked<Redis>;
  let callMock: jest.MockedFunction<
    (command: string, ...args: (string | number)[]) => Promise<RedisMockCallReturn>
  >;
  let processor: TestPostProcessor;

  beforeEach(() => {
    redisMock = createMock<Redis>();
    callMock = mockRedisCall(redisMock);

    processor = new TestPostProcessor(redisMock, {
      streamName: TestMessagingStream.TEST_STREAM,
      groupName: TestMessagingGroup.TEST_GROUP,
      consumerName: TestMessagingConsumer.TEST_CONSUMER,
      claimIntervalMs: 50,
      claimMinIdleTimeMs: 100,
      circuitBreaker: {
        failureThreshold: 2,
        resetTimeoutMs: 50,
        successThreshold: 2,
      },
    });
  });

  afterEach(async () => {
    await processor.stop();
    jest.restoreAllMocks();
  });

  it('should start CLOSED and transition to OPEN when failure threshold is reached', async () => {
    const cb = processor.getCircuitBreaker();
    expect(cb.getState()).toBe(CircuitBreakerState.CLOSED);

    const mockEvent = makeTestEvent('evt-1');
    mockRedisXreadgroup(callMock, TestMessagingStream.TEST_STREAM, [
      { messageId: '1-0', event: mockEvent },
      { messageId: '2-0', event: mockEvent },
      { messageId: '3-0', event: mockEvent },
    ]);

    processor.processError = new Error('Processor failed');

    await processor.start();
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 30);
    });

    expect(cb.getState()).toBe(CircuitBreakerState.CLOSED);
    expect(cb.getDiagnostics().failureCount).toBe(1);

    await new Promise<void>((resolve) => {
      setTimeout(resolve, 35);
    });

    expect(cb.getState()).toBe(CircuitBreakerState.OPEN);
  });

  it('should suspend stream consumption and other loops when OPEN', async () => {
    const cb = processor.getCircuitBreaker();
    const mockEvent = makeTestEvent('evt-2');
    mockRedisXreadgroup(callMock, TestMessagingStream.TEST_STREAM, [
      { messageId: '1-0', event: mockEvent },
    ]);

    processor.processError = new Error('Processor failed');
    await processor.start();

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        clearInterval(interval);
        reject(new Error('Circuit breaker did not open within 10000ms'));
      }, 10000);
      const interval = setInterval(() => {
        if (cb.getState() === CircuitBreakerState.OPEN) {
          clearInterval(interval);
          clearTimeout(timeout);
          resolve();
        }
      }, 10);
    });

    expect(cb.getState()).toBe(CircuitBreakerState.OPEN);

    callMock.mockClear();
    mockRedisXreadgroup(callMock, TestMessagingStream.TEST_STREAM, [
      { messageId: '2-0', event: mockEvent },
    ]);

    await new Promise<void>((resolve) => {
      setTimeout(resolve, 50);
    });

    const xreadCalls = callMock.mock.calls.filter((args) => args[0] === 'XREADGROUP');
    expect(xreadCalls.length).toBe(0);
  });

  it('should transition to HALF_OPEN after reset timeout and CLOSE on success threshold met', async () => {
    const cb = processor.getCircuitBreaker();
    const mockEvent = makeTestEvent('evt-3');
    mockRedisXreadgroup(callMock, TestMessagingStream.TEST_STREAM, [
      { messageId: '1-0', event: mockEvent },
    ]);

    processor.processError = new Error('Processor failed');
    await processor.start();

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        clearInterval(interval);
        reject(new Error('Circuit breaker did not open within 10000ms'));
      }, 10000);
      const interval = setInterval(() => {
        if (cb.getState() === CircuitBreakerState.OPEN) {
          clearInterval(interval);
          clearTimeout(timeout);
          resolve();
        }
      }, 10);
    });

    expect(cb.getState()).toBe(CircuitBreakerState.OPEN);

    processor.processError = null;

    await new Promise<void>((resolve) => {
      setTimeout(resolve, 60);
    });

    mockRedisXreadgroup(callMock, TestMessagingStream.TEST_STREAM, [
      { messageId: '2-0', event: mockEvent },
      { messageId: '3-0', event: mockEvent },
    ]);

    await new Promise<void>((resolve) => {
      setTimeout(resolve, 60);
    });

    expect(cb.getState()).toBe(CircuitBreakerState.CLOSED);
    expect(cb.getDiagnostics().failureCount).toBe(0);
  });
});
