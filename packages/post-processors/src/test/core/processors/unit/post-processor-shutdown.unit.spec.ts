import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import type { Redis } from 'ioredis';
import { createMock } from '@volontariapp/testing';
import type { PostProcessorOptions } from '../../../../interfaces/index.js';
import {
  TestPostProcessor,
  TestMessagingStream,
  TestMessagingGroup,
  TestMessagingConsumer,
  mockRedisCall,
  mockBlockingXreadgroup,
  waitFor,
} from '../../../utils/index.js';

describe('BasePostProcessor shutdown - Unit', () => {
  let redisMock: jest.Mocked<Redis>;
  let callMock: ReturnType<typeof mockRedisCall>;
  let processor: TestPostProcessor;
  let disconnectSpy: ReturnType<typeof jest.spyOn>;

  const buildProcessor = (overrides: Partial<PostProcessorOptions> = {}): TestPostProcessor =>
    new TestPostProcessor(redisMock, {
      streamName: TestMessagingStream.TEST_STREAM,
      groupName: TestMessagingGroup.TEST_GROUP,
      consumerName: TestMessagingConsumer.TEST_CONSUMER,
      claimIntervalMs: 50,
      claimMinIdleTimeMs: 100,
      ...overrides,
    });

  beforeEach(() => {
    redisMock = createMock<Redis>();
    redisMock.duplicate.mockReturnValue(redisMock);
    callMock = mockRedisCall(redisMock);
    disconnectSpy = jest.spyOn(redisMock, 'disconnect');
  });

  afterEach(async () => {
    await processor.stop();
    jest.restoreAllMocks();
  });

  it('makes a concurrent stop() wait for the stop already in progress', async () => {
    const xreadgroup = mockBlockingXreadgroup(callMock);
    processor = buildProcessor();
    await processor.start();
    await waitFor(() => xreadgroup.isReading());

    const resolved: string[] = [];
    const first = processor.stop().then(() => resolved.push('first'));
    const second = processor.stop().then(() => resolved.push('second'));

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(resolved).toEqual([]);

    xreadgroup.release();
    await Promise.all([first, second]);

    expect(resolved).toEqual(['first', 'second']);
    expect(disconnectSpy).toHaveBeenCalledTimes(1);
  });

  it('resolves stop() at once when the processor is not running', async () => {
    processor = buildProcessor();

    await expect(processor.stop()).resolves.toBeUndefined();
    expect(disconnectSpy).not.toHaveBeenCalled();
  });

  it('registers no signal listener when handleSignals is false', async () => {
    const onSpy = jest.spyOn(process, 'on');
    const sigtermBefore = process.listenerCount('SIGTERM');
    const sigintBefore = process.listenerCount('SIGINT');
    processor = buildProcessor({ handleSignals: false });

    await processor.start();

    expect(onSpy).not.toHaveBeenCalledWith('SIGTERM', expect.any(Function));
    expect(onSpy).not.toHaveBeenCalledWith('SIGINT', expect.any(Function));
    expect(process.listenerCount('SIGTERM')).toBe(sigtermBefore);
    expect(process.listenerCount('SIGINT')).toBe(sigintBefore);
  });

  it('registers one listener per signal by default and removes them on stop()', async () => {
    const sigtermBefore = process.listenerCount('SIGTERM');
    const sigintBefore = process.listenerCount('SIGINT');
    processor = buildProcessor();

    await processor.start();
    expect(process.listenerCount('SIGTERM')).toBe(sigtermBefore + 1);
    expect(process.listenerCount('SIGINT')).toBe(sigintBefore + 1);

    await processor.stop();
    expect(process.listenerCount('SIGTERM')).toBe(sigtermBefore);
    expect(process.listenerCount('SIGINT')).toBe(sigintBefore);
  });
});
