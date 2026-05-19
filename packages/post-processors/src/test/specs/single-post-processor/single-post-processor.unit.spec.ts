import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { EventMessagingType } from '@volontariapp/messaging';
import type { Redis } from 'ioredis';
import { createMock } from '@volontariapp/testing';
import {
  TestPostProcessor,
  makeTestEvent,
  TestMessagingStream,
  TestMessagingGroup,
  TestMessagingConsumer,
  TestEventId,
  mockRedisCall,
  mockRedisXreadgroup,
} from '../../utils/index.js';

describe('SinglePostProcessor', () => {
  let redisMock: jest.Mocked<Redis>;
  let processor: TestPostProcessor;
  let callMock: ReturnType<typeof mockRedisCall>;

  beforeEach(() => {
    jest.clearAllMocks();
    redisMock = createMock<Redis>();
    callMock = mockRedisCall(redisMock);

    processor = new TestPostProcessor(redisMock, {
      streamName: TestMessagingStream.TEST_STREAM,
      groupName: TestMessagingGroup.TEST_GROUP,
      consumerName: TestMessagingConsumer.TEST_CONSUMER,
      claimIntervalMs: 50,
      claimMinIdleTimeMs: 100,
    });
  });

  afterEach(async () => {
    await processor.stop();
  });

  describe('start/stop', () => {
    it('should ensure consumer group on start', async () => {
      await processor.start();
      expect(callMock).toHaveBeenCalledWith(
        'XGROUP',
        'CREATE',
        TestMessagingStream.TEST_STREAM,
        TestMessagingGroup.TEST_GROUP,
        '0',
        'MKSTREAM',
      );
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

  describe('runLoop', () => {
    it('should read pending messages and then new messages', async () => {
      const mockEvent = makeTestEvent(TestEventId.DEFAULT);

      mockRedisXreadgroup(callMock, TestMessagingStream.TEST_STREAM, [
        { messageId: TestEventId.MSG_PENDING, event: mockEvent },
      ]);

      const processSpy = jest.spyOn(processor, 'processEvent');
      const shouldProcessSpy = jest.spyOn(processor, 'shouldProcess');
      const acknowledgeSpy = jest.spyOn(processor, 'acknowledge');

      await processor.start();
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(processSpy).toHaveBeenCalledTimes(1);
      expect(processSpy).toHaveBeenCalledWith(
        expect.objectContaining({ id: TestEventId.DEFAULT }),
        TestEventId.MSG_PENDING,
      );

      expect(shouldProcessSpy).toHaveBeenCalledWith(EventMessagingType.EVENT_CHANGED);
      expect(acknowledgeSpy).toHaveBeenCalledWith(TestEventId.MSG_PENDING);

      expect(callMock).toHaveBeenCalledWith(
        'XREADGROUP',
        'GROUP',
        TestMessagingGroup.TEST_GROUP,
        TestMessagingConsumer.TEST_CONSUMER,
        'COUNT',
        10,
        'STREAMS',
        TestMessagingStream.TEST_STREAM,
        '0',
      );
    });

    it('should not acknowledge if processEvent throws', async () => {
      const mockEvent = makeTestEvent(TestEventId.DEFAULT);

      mockRedisXreadgroup(callMock, TestMessagingStream.TEST_STREAM, [
        { messageId: TestEventId.MSG_PENDING, event: mockEvent },
      ]);

      const processSpy = jest.spyOn(processor, 'processEvent');
      const shouldProcessSpy = jest.spyOn(processor, 'shouldProcess');
      const acknowledgeSpy = jest.spyOn(processor, 'acknowledge');
      processor.processError = new Error('Process failed');

      await processor.start();
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(processSpy).toHaveBeenCalledTimes(1);
      expect(shouldProcessSpy).toHaveBeenCalledWith(EventMessagingType.EVENT_CHANGED);
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
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(processSpy).not.toHaveBeenCalled();
      expect(shouldProcessSpy).toHaveBeenCalledWith('unregistered.type');
      expect(acknowledgeSpy).toHaveBeenCalledWith(TestEventId.MSG_PENDING);
    });
  });

  describe('claim loop', () => {
    it('should scan and claim long-idle pending messages from other consumers', async () => {
      callMock.mockImplementation(async (command: string, ..._args: (string | number)[]) => {
        if (command === 'XPENDING') {
          return [
            [TestEventId.MSG_CLAIMABLE, 'other-consumer', 150, 2],
            [TestEventId.MSG_OWN_PENDING, TestMessagingConsumer.TEST_CONSUMER, 200, 1],
          ];
        }
        if (command === 'XREADGROUP') {
          await new Promise((resolve) => setTimeout(resolve, 50));
        }
        return [];
      });

      await processor.start();
      await new Promise((resolve) => setTimeout(resolve, 80));

      expect(callMock).toHaveBeenCalledWith(
        'XPENDING',
        TestMessagingStream.TEST_STREAM,
        TestMessagingGroup.TEST_GROUP,
        '-',
        '+',
        10,
      );
      expect(callMock).toHaveBeenCalledWith(
        'XCLAIM',
        TestMessagingStream.TEST_STREAM,
        TestMessagingGroup.TEST_GROUP,
        TestMessagingConsumer.TEST_CONSUMER,
        '100',
        TestEventId.MSG_CLAIMABLE,
        'JUSTID',
      );
      expect(callMock).not.toHaveBeenCalledWith(
        'XCLAIM',
        TestMessagingStream.TEST_STREAM,
        TestMessagingGroup.TEST_GROUP,
        TestMessagingConsumer.TEST_CONSUMER,
        '100',
        TestEventId.MSG_OWN_PENDING,
        'JUSTID',
      );
    });
  });
});
