import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import type { Redis } from 'ioredis';
import { createMock } from '@volontariapp/testing';
import {
  TestPostProcessor,
  TestBatchPostProcessor,
  TestMessagingStream,
  TestMessagingGroup,
  TestMessagingConsumer,
  mockRedisCall,
} from '../../utils/index.js';
import { RedisStreamHelper } from '../../../core/helpers/redis-stream.helper.js';

describe('BasePostProcessor — Unit Edge Cases', () => {
  let redisMock: jest.Mocked<Redis>;
  let callMock: ReturnType<typeof mockRedisCall>;

  beforeEach(() => {
    jest.clearAllMocks();
    redisMock = createMock<Redis>();
    callMock = mockRedisCall(redisMock);
  });

  describe('Constructor Validation', () => {
    it('should throw error if Redis instance does not have a call function', () => {
      const invalidRedis = createMock<Redis>();
      Object.defineProperty(invalidRedis, 'call', { value: undefined });

      expect(() => {
        new TestPostProcessor(invalidRedis, {
          streamName: TestMessagingStream.TEST_STREAM,
          groupName: TestMessagingGroup.TEST_GROUP,
        });
      }).toThrow('Invalid Redis instance: must support .call command execution');
    });
  });

  describe('Signal Handling & Graceful Shutdown', () => {
    it('should register and clean up signal handlers on start/stop, and handle graceful shutdown', async () => {
      const processOnSpy = jest.spyOn(process, 'on');
      const processOffSpy = jest.spyOn(process, 'off');

      const processor = new TestPostProcessor(redisMock, {
        streamName: TestMessagingStream.TEST_STREAM,
        groupName: TestMessagingGroup.TEST_GROUP,
        consumerName: TestMessagingConsumer.TEST_CONSUMER,
      });

      await processor.start();

      // Check SIGTERM and SIGINT are registered
      const sigtermCall = processOnSpy.mock.calls.find((call) => call[0] === 'SIGTERM');
      const sigintCall = processOnSpy.mock.calls.find((call) => call[0] === 'SIGINT');

      expect(sigtermCall).toBeDefined();
      expect(sigintCall).toBeDefined();

      const sigtermListener = sigtermCall?.[1] as () => void;
      const sigintListener = sigintCall?.[1] as () => void;

      const stopSpy = jest.spyOn(processor, 'stop').mockResolvedValue(undefined);

      // Trigger SIGTERM listener
      sigtermListener();
      expect(stopSpy).toHaveBeenCalledTimes(1);

      // Trigger SIGINT listener
      sigintListener();
      expect(stopSpy).toHaveBeenCalledTimes(2);

      stopSpy.mockRestore();

      await processor.stop();

      // Check SIGTERM and SIGINT are cleaned up
      const sigtermOffCall = processOffSpy.mock.calls.find((call) => call[0] === 'SIGTERM');
      const sigintOffCall = processOffSpy.mock.calls.find((call) => call[0] === 'SIGINT');

      expect(sigtermOffCall).toBeDefined();
      expect(sigintOffCall).toBeDefined();

      processOnSpy.mockRestore();
      processOffSpy.mockRestore();
    });
  });

  describe('SinglePostProcessor Parsing & Validation Failures', () => {
    let processor: TestPostProcessor;

    beforeEach(() => {
      processor = new TestPostProcessor(redisMock, {
        streamName: TestMessagingStream.TEST_STREAM,
        groupName: TestMessagingGroup.TEST_GROUP,
        consumerName: TestMessagingConsumer.TEST_CONSUMER,
        claimIntervalMs: 50,
        claimMinIdleTimeMs: 100,
        idempotencyTtlSeconds: 10,
        retry: {
          maxRetries: 1,
          initialDelayMs: 10,
          maxDelayMs: 100,
          backoffMultiplier: 1.5,
          enableDlq: true,
        },
      });
    });

    afterEach(async () => {
      await processor.stop();
    });

    it('should skip and acknowledge message missing event payload', async () => {
      callMock.mockImplementation(async (command: string, ..._args: (string | number)[]) => {
        if (command === 'XGROUP') return 'OK';
        if (command === 'XACK') return 1;
        if (command === 'XREADGROUP') {
          return [
            [
              TestMessagingStream.TEST_STREAM,
              [
                ['msg-1', ['id', 'evt-1', 'type', 'event.changed']], // Missing 'event' payload field!
              ],
            ],
          ];
        }
        await Promise.resolve();

        return null;
      });

      const warnSpy = jest.spyOn(processor.getLogger(), 'warn').mockImplementation(() => {});
      const acknowledgeSpy = jest.spyOn(processor, 'acknowledge');

      await processor.start();
      await new Promise((resolve) => setTimeout(resolve, 60));

      expect(warnSpy).toHaveBeenCalledWith(
        'Stream message missing event payload, acknowledging and skipping',
        expect.any(Object),
      );
      expect(acknowledgeSpy).toHaveBeenCalledWith('msg-1');
      warnSpy.mockRestore();
    });

    it('should skip and acknowledge message with unregistered type', async () => {
      callMock.mockImplementation(async (command: string, ..._args: (string | number)[]) => {
        if (command === 'XGROUP') return 'OK';
        if (command === 'XACK') return 1;
        if (command === 'XREADGROUP') {
          return [
            [
              TestMessagingStream.TEST_STREAM,
              [['msg-2', ['id', 'evt-2', 'type', 'unregistered.event.type', 'event', '{}']]],
            ],
          ];
        }
        await Promise.resolve();

        return null;
      });

      jest.spyOn(processor, 'shouldProcess').mockReturnValue(false);
      const debugSpy = jest.spyOn(processor.getLogger(), 'debug').mockImplementation(() => {});
      const acknowledgeSpy = jest.spyOn(processor, 'acknowledge');

      await processor.start();
      await new Promise((resolve) => setTimeout(resolve, 60));

      expect(debugSpy).toHaveBeenCalledWith(
        'Skipping message: type not registered/handled',
        expect.any(Object),
      );
      expect(acknowledgeSpy).toHaveBeenCalledWith('msg-2');
      debugSpy.mockRestore();
    });

    it('should skip and acknowledge message if idempotency lock acquisition fails', async () => {
      callMock.mockImplementation(async (command: string, ..._args: (string | number)[]) => {
        if (command === 'XGROUP') return 'OK';
        if (command === 'XACK') return 1;
        if (command === 'SET') return null; // NX failed
        if (command === 'XREADGROUP') {
          return [
            [
              TestMessagingStream.TEST_STREAM,
              [
                [
                  'msg-3',
                  [
                    'id',
                    'evt-3',
                    'type',
                    'event.changed',
                    'event',
                    '{"id":"evt-3","type":"event.changed"}',
                  ],
                ],
              ],
            ],
          ];
        }
        await Promise.resolve();

        return null;
      });

      const warnSpy = jest.spyOn(processor.getLogger(), 'warn').mockImplementation(() => {});
      const acknowledgeSpy = jest.spyOn(processor, 'acknowledge');

      await processor.start();
      await new Promise((resolve) => setTimeout(resolve, 60));

      expect(warnSpy).toHaveBeenCalledWith(
        'Message already processed or currently processing (idempotency block)',
        expect.any(Object),
      );
      expect(acknowledgeSpy).toHaveBeenCalledWith('msg-3');
      warnSpy.mockRestore();
    });

    it('should fail and send to DLQ if event payload is not a non-null object', async () => {
      callMock.mockImplementation(async (command: string, ..._args: (string | number)[]) => {
        if (command === 'XGROUP') return 'OK';
        if (command === 'XACK') return 1;
        if (command === 'XADD') return 'dlq-msg-id';
        if (command === 'XREADGROUP') {
          return [
            [
              TestMessagingStream.TEST_STREAM,
              [['msg-4', ['id', 'evt-4', 'type', 'event.changed', 'event', '"not-an-object"']]],
            ],
          ];
        }
        await Promise.resolve();

        return null;
      });

      const errorSpy = jest.spyOn(processor.getLogger(), 'error').mockImplementation(() => {});
      const acknowledgeSpy = jest.spyOn(processor, 'acknowledge');

      await processor.start();
      await new Promise((resolve) => setTimeout(resolve, 60));

      expect(errorSpy).toHaveBeenCalledWith(
        'Failed to process event from stream',
        expect.any(Object),
      );
      expect(errorSpy).toHaveBeenCalledWith(
        'Message max retries exceeded, sent to DLQ',
        expect.any(Object),
      );
      expect(acknowledgeSpy).toHaveBeenCalledWith('msg-4');
      errorSpy.mockRestore();
    });

    it('should fail if event payload is missing valid string id', async () => {
      callMock.mockImplementation(async (command: string, ..._args: (string | number)[]) => {
        if (command === 'XGROUP') return 'OK';
        if (command === 'XREADGROUP') {
          return [
            [
              TestMessagingStream.TEST_STREAM,
              [
                [
                  'msg-5',
                  ['id', 'evt-5', 'type', 'event.changed', 'event', '{"type":"event.changed"}'],
                ],
              ],
            ],
          ];
        }
        await Promise.resolve();

        return null;
      });

      const errorSpy = jest.spyOn(processor.getLogger(), 'error').mockImplementation(() => {});

      await processor.start();
      await new Promise((resolve) => setTimeout(resolve, 60));

      expect(errorSpy).toHaveBeenCalledWith(
        'Failed to process event from stream',
        expect.objectContaining({
          error: expect.objectContaining({
            message: 'Event payload is missing a valid string id',
          }),
        }),
      );
      errorSpy.mockRestore();
    });

    it('should fail if event payload is missing valid string type', async () => {
      callMock.mockImplementation(async (command: string, ..._args: (string | number)[]) => {
        if (command === 'XGROUP') return 'OK';
        if (command === 'XREADGROUP') {
          return [
            [
              TestMessagingStream.TEST_STREAM,
              [['msg-6', ['id', 'evt-6', 'type', 'event.changed', 'event', '{"id":"evt-6"}']]],
            ],
          ];
        }
        await Promise.resolve();
        return null;
      });

      const errorSpy = jest.spyOn(processor.getLogger(), 'error').mockImplementation(() => {});

      await processor.start();
      await new Promise((resolve) => setTimeout(resolve, 60));

      expect(errorSpy).toHaveBeenCalledWith(
        'Failed to process event from stream',
        expect.objectContaining({
          error: expect.objectContaining({
            message: 'Event payload is missing a valid string type',
          }),
        }),
      );
      errorSpy.mockRestore();
    });
  });

  describe('BatchPostProcessor Parsing & Validation Failures', () => {
    let processor: TestBatchPostProcessor;

    beforeEach(() => {
      processor = new TestBatchPostProcessor(redisMock, {
        streamName: TestMessagingStream.TEST_STREAM,
        groupName: TestMessagingGroup.TEST_GROUP,
        consumerName: TestMessagingConsumer.TEST_CONSUMER,
        claimIntervalMs: 50,
        claimMinIdleTimeMs: 100,
        idempotencyTtlSeconds: 10,
        batchSize: 5,
        retry: {
          maxRetries: 1,
          initialDelayMs: 10,
          maxDelayMs: 100,
          backoffMultiplier: 1.5,
          enableDlq: true,
        },
      });
    });

    afterEach(async () => {
      await processor.stop();
    });

    it('should skip and acknowledge message missing event payload in batch', async () => {
      callMock.mockImplementation(async (command: string, ..._args: (string | number)[]) => {
        if (command === 'XGROUP') return 'OK';
        if (command === 'XACK') return 1;
        if (command === 'XREADGROUP') {
          return [
            [
              TestMessagingStream.TEST_STREAM,
              [['msg-batch-1', ['id', 'evt-1', 'type', 'event.changed']]],
            ],
          ];
        }
        await Promise.resolve();
        return null;
      });

      const warnSpy = jest.spyOn(processor.getLogger(), 'warn').mockImplementation(() => {});
      const acknowledgeSpy = jest.spyOn(processor, 'acknowledge');

      await processor.start();
      await new Promise((resolve) => setTimeout(resolve, 60));

      expect(warnSpy).toHaveBeenCalledWith(
        'Stream message missing event payload, acknowledging and skipping',
        expect.any(Object),
      );
      expect(acknowledgeSpy).toHaveBeenCalledWith('msg-batch-1');
      warnSpy.mockRestore();
    });

    it('should skip and acknowledge message with unregistered type in batch', async () => {
      callMock.mockImplementation(async (command: string, ..._args: (string | number)[]) => {
        if (command === 'XGROUP') return 'OK';
        if (command === 'XACK') return 1;
        if (command === 'XREADGROUP') {
          return [
            [
              TestMessagingStream.TEST_STREAM,
              [['msg-batch-2', ['id', 'evt-2', 'type', 'unregistered.type', 'event', '{}']]],
            ],
          ];
        }
        await Promise.resolve();
        return null;
      });

      jest.spyOn(processor, 'shouldProcess').mockReturnValue(false);
      const debugSpy = jest.spyOn(processor.getLogger(), 'debug').mockImplementation(() => {});
      const acknowledgeSpy = jest.spyOn(processor, 'acknowledge');

      await processor.start();
      await new Promise((resolve) => setTimeout(resolve, 60));

      expect(debugSpy).toHaveBeenCalledWith(
        'Skipping message: type not registered/handled',
        expect.any(Object),
      );
      expect(acknowledgeSpy).toHaveBeenCalledWith('msg-batch-2');
      debugSpy.mockRestore();
    });

    it('should skip and acknowledge message if idempotency lock acquisition fails in batch', async () => {
      callMock.mockImplementation(async (command: string, ..._args: (string | number)[]) => {
        if (command === 'XGROUP') return 'OK';
        if (command === 'XACK') return 1;
        if (command === 'SET') return null; // Lock failed
        if (command === 'XREADGROUP') {
          await Promise.resolve();

          return [
            [
              TestMessagingStream.TEST_STREAM,
              [
                [
                  'msg-batch-3',
                  [
                    'id',
                    'evt-3',
                    'type',
                    'event.changed',
                    'event',
                    '{"id":"evt-3","type":"event.changed"}',
                  ],
                ],
              ],
            ],
          ];
        }
        return null;
      });

      const warnSpy = jest.spyOn(processor.getLogger(), 'warn').mockImplementation(() => {});
      const acknowledgeSpy = jest.spyOn(processor, 'acknowledge');

      await processor.start();
      await new Promise((resolve) => setTimeout(resolve, 60));

      expect(warnSpy).toHaveBeenCalledWith(
        'Message already processed or currently processing (idempotency block)',
        expect.any(Object),
      );
      expect(acknowledgeSpy).toHaveBeenCalledWith('msg-batch-3');
      warnSpy.mockRestore();
    });

    it('should log warning/error and acknowledge skipping on parsing catch block in batch', async () => {
      callMock.mockImplementation(async (command: string, ..._args: (string | number)[]) => {
        if (command === 'XGROUP') return 'OK';
        if (command === 'XACK') return 1;
        if (command === 'XREADGROUP') {
          return [
            [
              TestMessagingStream.TEST_STREAM,
              [['msg-batch-4', ['id', 'evt-4', 'type', 'event.changed', 'event', 'invalid-json{']]],
            ],
          ];
        }
        await Promise.resolve();

        return null;
      });

      const errorSpy = jest.spyOn(processor.getLogger(), 'error').mockImplementation(() => {});
      const acknowledgeSpy = jest.spyOn(processor, 'acknowledge');

      await processor.start();
      await new Promise((resolve) => setTimeout(resolve, 60));

      expect(errorSpy).toHaveBeenCalledWith(
        'Failed to parse or validate event payload, acknowledging and skipping',
        expect.any(Object),
      );
      expect(acknowledgeSpy).toHaveBeenCalledWith('msg-batch-4');
      errorSpy.mockRestore();
    });

    it('should log error when releaseIdempotencyLocks fails inside batch processor', async () => {
      // Setup stream entries to trigger failure in batch processing
      callMock.mockImplementation(async (command: string, ..._args: (string | number)[]) => {
        if (command === 'XGROUP') return 'OK';
        if (command === 'XREADGROUP') {
          return [
            [
              TestMessagingStream.TEST_STREAM,
              [
                [
                  'msg-batch-5',
                  [
                    'id',
                    'evt-5',
                    'type',
                    'event.changed',
                    'event',
                    '{"id":"evt-5","type":"event.changed"}',
                  ],
                ],
              ],
            ],
          ];
        }
        await Promise.resolve();

        return null;
      });

      // Force processEvents to fail
      processor.processError = new Error('Processor failed');

      // Make removeIdempotencyLock throw
      const removeLockSpy = jest
        .spyOn(RedisStreamHelper, 'removeIdempotencyLock')
        .mockRejectedValue(new Error('Redis disconnect'));

      const errorSpy = jest.spyOn(processor.getLogger(), 'error').mockImplementation(() => {});

      await processor.start();
      await new Promise((resolve) => setTimeout(resolve, 60));

      expect(errorSpy).toHaveBeenCalledWith(
        'Failed to release idempotency lock',
        expect.objectContaining({
          messageId: 'msg-batch-5',
          error: expect.objectContaining({
            message: 'Redis disconnect',
          }),
        }),
      );

      errorSpy.mockRestore();
      removeLockSpy.mockRestore();
    });

    it('should handle retry execution error when handling batch processing failure', async () => {
      // Setup stream entries to trigger failure in batch processing
      callMock.mockImplementation(async (command: string, ..._args: (string | number)[]) => {
        if (command === 'XGROUP') return 'OK';
        if (command === 'XREADGROUP') {
          return [
            [
              TestMessagingStream.TEST_STREAM,
              [
                [
                  'msg-batch-6',
                  [
                    'id',
                    'evt-6',
                    'type',
                    'event.changed',
                    'event',
                    '{"id":"evt-6","type":"event.changed"}',
                  ],
                ],
              ],
            ],
          ];
        }
        await Promise.resolve();
        return null;
      });

      // Force processEvents to fail
      processor.processError = new Error('Processor failed');

      // Mock recordRetry to throw an error
      const recordRetrySpy = jest
        .spyOn(processor['retryHelper'], 'recordRetry')
        .mockRejectedValue(new Error('Retry write failure'));

      const errorSpy = jest.spyOn(processor.getLogger(), 'error').mockImplementation(() => {});

      await processor.start();
      await new Promise((resolve) => setTimeout(resolve, 60));

      expect(errorSpy).toHaveBeenCalledWith(
        'Failed to handle batch item retry',
        expect.objectContaining({
          messageId: 'msg-batch-6',
          error: expect.objectContaining({
            message: 'Retry write failure',
          }),
        }),
      );

      errorSpy.mockRestore();
      recordRetrySpy.mockRestore();
    });

    it('should fall back to DLQ when max retries are exceeded in batch processing', async () => {
      // Setup stream entries to trigger failure in batch processing
      callMock.mockImplementation(async (command: string, ..._args: (string | number)[]) => {
        if (command === 'XGROUP') return 'OK';
        if (command === 'XACK') return 1;
        if (command === 'XADD') return 'dlq-msg-id';
        if (command === 'XREADGROUP') {
          return [
            [
              TestMessagingStream.TEST_STREAM,
              [
                [
                  'msg-batch-7',
                  [
                    'id',
                    'evt-7',
                    'type',
                    'event.changed',
                    'event',
                    '{"id":"evt-7","type":"event.changed"}',
                  ],
                ],
              ],
            ],
          ];
        }
        await Promise.resolve();
        return null;
      });

      // Force processEvents to fail
      processor.processError = new Error('Processor failed');

      // Mock recordRetry to return 2 attempts (> maxRetries of 1)
      const recordRetrySpy = jest
        .spyOn(processor['retryHelper'], 'recordRetry')
        .mockResolvedValue(2);

      const shouldRetrySpy = jest
        .spyOn(processor['retryHelper'], 'shouldRetry')
        .mockReturnValue(false);

      const errorSpy = jest.spyOn(processor.getLogger(), 'error').mockImplementation(() => {});
      const acknowledgeSpy = jest.spyOn(processor, 'acknowledge');

      await processor.start();
      await new Promise((resolve) => setTimeout(resolve, 60));

      expect(errorSpy).toHaveBeenCalledWith(
        'Batch item max retries exceeded, sent to DLQ',
        expect.objectContaining({
          messageId: 'msg-batch-7',
          attemptCount: 2,
          maxRetries: 1,
        }),
      );
      expect(acknowledgeSpy).toHaveBeenCalledWith('msg-batch-7');

      errorSpy.mockRestore();
      recordRetrySpy.mockRestore();
      shouldRetrySpy.mockRestore();
    });
  });
});
