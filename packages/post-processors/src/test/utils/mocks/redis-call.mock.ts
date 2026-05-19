import type { Redis } from 'ioredis';
import { createMock } from '@volontariapp/testing';
import { jest } from '@jest/globals';
import type { StreamEvent } from '@volontariapp/messaging';
import { TestPostProcessor } from '../classes/test-post-processor.class.js';
import {
  TestMessagingStream,
  TestMessagingGroup,
  TestMessagingConsumer,
} from '../enums/test-messaging.enum.js';

export type RedisMockCallReturn = string | number | null | RedisMockCallReturn[];

export function mockRedisCall(
  redisMock: jest.Mocked<Redis>,
): jest.MockedFunction<
  (command: string, ...args: (string | number)[]) => Promise<RedisMockCallReturn>
> {
  const callMock = jest.spyOn(redisMock, 'call') as unknown as jest.MockedFunction<
    (command: string, ...args: (string | number)[]) => Promise<RedisMockCallReturn>
  >;

  callMock.mockImplementation(async (command: string, ..._args: (string | number)[]) => {
    if (command === 'XGROUP') return 'OK';
    if (command === 'XACK') return 1;
    if (command === 'XPENDING') return [];
    if (command === 'XCLAIM') return [];
    if (command === 'SET') return 'OK';
    if (command === 'DEL') return 1;
    if (command === 'XREADGROUP') {
      await new Promise((resolve) => setTimeout(resolve, 50));
      return [];
    }
    return null;
  });

  // Mock direct Redis client methods used by helpers
  redisMock.incr.mockResolvedValue(1);
  redisMock.set.mockResolvedValue('OK');
  redisMock.expire.mockResolvedValue(1);
  redisMock.get.mockResolvedValue(null);
  redisMock.zadd.mockResolvedValue('1');
  redisMock.zrangebyscore.mockResolvedValue([]);
  redisMock.zrem.mockResolvedValue(1);
  redisMock.del.mockResolvedValue(1);
  redisMock.xadd.mockResolvedValue('1-0');

  return callMock;
}

export function formatEventsToXreadgroupResponse(
  streamName: string,
  entries: Array<{ messageId: string; event: StreamEvent }>,
): RedisMockCallReturn {
  return [
    [
      streamName,
      entries.map(({ messageId, event }) => [
        messageId,
        ['id', event.id, 'type', event.type, 'event', JSON.stringify(event)],
      ]),
    ],
  ];
}

export function mockRedisXreadgroup(
  callMock: ReturnType<typeof mockRedisCall>,
  streamName: string,
  entries: Array<{ messageId: string; event: StreamEvent }>,
): void {
  let xreadgroupCount = 0;
  callMock.mockImplementation(async (command: string, ..._args: (string | number)[]) => {
    if (command === 'XGROUP') return 'OK';
    if (command === 'XACK') return 1;
    if (command === 'SET') return 'OK';
    if (command === 'DEL') return 1;
    if (command === 'XREADGROUP') {
      xreadgroupCount++;
      if (xreadgroupCount === 1) {
        return formatEventsToXreadgroupResponse(streamName, entries);
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
      return [];
    }
    return null;
  });
}

export interface TestProcessorSetup {
  redisMock: jest.Mocked<Redis>;
  processor: TestPostProcessor;
  callMock: jest.MockedFunction<
    (command: string, ...args: (string | number)[]) => Promise<RedisMockCallReturn>
  >;
}

export function setupTestProcessor(): TestProcessorSetup {
  const redisMock = createMock<Redis>();
  const callMock = mockRedisCall(redisMock);

  const processor = new TestPostProcessor(redisMock, {
    streamName: TestMessagingStream.TEST_STREAM,
    groupName: TestMessagingGroup.TEST_GROUP,
    consumerName: TestMessagingConsumer.TEST_CONSUMER,
    claimIntervalMs: 50,
    claimMinIdleTimeMs: 100,
  });

  return { redisMock, processor, callMock };
}
