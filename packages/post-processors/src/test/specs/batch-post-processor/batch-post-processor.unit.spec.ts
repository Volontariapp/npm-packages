import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import type { Redis } from 'ioredis';
import { createMock } from '@volontariapp/testing';
import {
  TestBatchPostProcessor,
  makeTestEvent,
  TestMessagingStream,
  TestMessagingGroup,
  TestMessagingConsumer,
  mockRedisCall,
  mockRedisXreadgroup,
} from '../../utils/index.js';

describe('BatchPostProcessor', () => {
  let redisMock: jest.Mocked<Redis>;
  let processor: TestBatchPostProcessor;
  let callMock: ReturnType<typeof mockRedisCall>;

  beforeEach(() => {
    jest.clearAllMocks();
    redisMock = createMock<Redis>();
    callMock = mockRedisCall(redisMock);

    processor = new TestBatchPostProcessor(redisMock, {
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
      await new Promise((resolve) => setTimeout(resolve, 50));

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

      expect(callMock).toHaveBeenCalledWith(
        'XACK',
        TestMessagingStream.TEST_STREAM,
        TestMessagingGroup.TEST_GROUP,
        '1-0',
      );
      expect(callMock).toHaveBeenCalledWith(
        'XACK',
        TestMessagingStream.TEST_STREAM,
        TestMessagingGroup.TEST_GROUP,
        '2-0',
      );
    });

    it('should not acknowledge batch if processEvents throws an error', async () => {
      const mockEvent = makeTestEvent('evt-1');

      mockRedisXreadgroup(callMock, TestMessagingStream.TEST_STREAM, [
        { messageId: '1-0', event: mockEvent },
      ]);

      const processSpy = jest.spyOn(processor, 'processEvents');
      processor.processError = new Error('Batch processing failed');

      await processor.start();
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(processSpy).toHaveBeenCalledTimes(1);
      expect(callMock).not.toHaveBeenCalledWith(
        'XACK',
        expect.any(String),
        expect.any(String),
        expect.any(String),
      );
    });
  });
});
