import { describe, expect, it, beforeEach, jest, afterEach } from '@jest/globals';
import { OutboxRunner } from '../../outbox/runners/outbox.runner.js';
import { OutboxConsumer } from '../../outbox/consumers/outbox.consumer.js';
import { OutboxRunnerConfig, LoggerConfig, LoggerFormat } from '@volontariapp/config';
import type { OutboxModel } from '../../outbox/models/outbox.model.js';
import type { OutboxEntity } from '../../outbox/entities/outbox.entity.js';
import type { BaseRepository } from '../../core/base.repository.js';
import { Logger } from '@volontariapp/logger';

// Define the mock function outside to ensure it's a stable Jest mock
const internalMockSetTimeout = jest.fn();

// Mock node:timers/promises using a factory
jest.mock('node:timers/promises', () => ({
  __esModule: true,
  setTimeout: (...args: unknown[]) => internalMockSetTimeout(...args),
}));

jest.mock('@volontariapp/logger');

describe('OutboxRunner (Unit)', () => {
  // Define runner as optional to satisfy linter checks in afterEach
  let runner: OutboxRunner<OutboxModel, OutboxEntity> | undefined;
  let repositoryMock: jest.Mocked<BaseRepository<OutboxModel, OutboxEntity, string>>;
  let fetchPendingItemsSpy: jest.SpiedFunction<
    OutboxConsumer<OutboxModel, OutboxEntity>['fetchPendingItems']
  >;

  const config = new OutboxRunnerConfig();
  config.batchIntervalMs = 200;
  config.batchSize = 10;
  config.logger = new LoggerConfig();
  config.logger.format = LoggerFormat.JSON;
  config.logger.level = 'info';

  const flush = async (): Promise<void> => {
    for (let i = 0; i < 20; i++) {
      await Promise.resolve();
    }
  };

  const waitForCalls = async (target: number, timeoutMs = 1000): Promise<void> => {
    const start = Date.now();
    while (fetchPendingItemsSpy.mock.calls.length < target && Date.now() - start < timeoutMs) {
      await flush();
      await jest.advanceTimersByTimeAsync(0);
    }
  };

  beforeEach(() => {
    jest.useFakeTimers();

    repositoryMock = {
      metadata: { tableName: 'outbox' },
    } as unknown as jest.Mocked<BaseRepository<OutboxModel, OutboxEntity, string>>;

    fetchPendingItemsSpy = jest.spyOn(
      OutboxConsumer.prototype,
      'fetchPendingItems',
    ) as jest.SpiedFunction<OutboxConsumer<OutboxModel, OutboxEntity>['fetchPendingItems']>;

    // Re-configure the mock implementation for each test
    internalMockSetTimeout.mockImplementation(
      (ms: number | undefined, value: unknown, options: { signal?: AbortSignal } | undefined) => {
        return new Promise((resolve, reject) => {
          const delay = ms ?? 1;
          const timeout = global.setTimeout(() => {
            resolve(value);
          }, delay);

          if (options?.signal) {
            const signal = options.signal;
            if (signal.aborted) {
              global.clearTimeout(timeout);
              const error = new Error('The operation was aborted');
              error.name = 'AbortError';
              reject(error);
              return;
            }
            signal.addEventListener(
              'abort',
              () => {
                global.clearTimeout(timeout);
                const error = new Error('The operation was aborted');
                error.name = 'AbortError';
                reject(error);
              },
              { once: true },
            );
          }
        });
      },
    );

    runner = new OutboxRunner(repositoryMock, config);
  });

  afterEach(async () => {
    if (runner) {
      await runner.stop();
    }
    internalMockSetTimeout.mockReset();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('should call fetchPendingItems periodically after start', async () => {
    fetchPendingItemsSpy.mockResolvedValue([]);
    if (runner) runner.start();

    await waitForCalls(1);
    expect(fetchPendingItemsSpy).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(200);
    await waitForCalls(2);
    expect(fetchPendingItemsSpy).toHaveBeenCalledTimes(2);

    jest.advanceTimersByTime(200);
    await waitForCalls(3);
    expect(fetchPendingItemsSpy).toHaveBeenCalledTimes(3);
  });

  it('runCycle() should execute a single fetch and return', async () => {
    fetchPendingItemsSpy.mockResolvedValue([]);
    if (runner) await runner.runCycle();
    expect(fetchPendingItemsSpy).toHaveBeenCalledTimes(1);
  });

  it('should log error if runCycle fails but continue running in start loop', async () => {
    const error = new Error('Fetch failed');
    fetchPendingItemsSpy.mockRejectedValueOnce(error);
    fetchPendingItemsSpy.mockResolvedValue([]);

    if (runner) runner.start();
    await waitForCalls(1);
    expect(fetchPendingItemsSpy).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(200);
    await waitForCalls(2);
    expect(fetchPendingItemsSpy).toHaveBeenCalledTimes(2);
  });

  it('should stop running when stop is called', async () => {
    fetchPendingItemsSpy.mockResolvedValue([]);
    if (runner) runner.start();
    await waitForCalls(1);
    expect(fetchPendingItemsSpy).toHaveBeenCalledTimes(1);

    if (runner) {
      const stopPromise = runner.stop();
      await flush();
      jest.advanceTimersByTime(0);
      await flush();
      await stopPromise;
    }

    jest.advanceTimersByTime(400);
    await flush();
    expect(fetchPendingItemsSpy).toHaveBeenCalledTimes(1);
  });

  it('should wait for current cycle to finish during graceful shutdown', async () => {
    let cycleFinished = false;
    fetchPendingItemsSpy.mockImplementation(async () => {
      await new Promise((resolve) => global.setTimeout(resolve, 50));
      cycleFinished = true;
      return [];
    });

    if (runner) runner.start();
    await flush();
    expect(fetchPendingItemsSpy).toHaveBeenCalledTimes(1);

    if (runner) {
      const stopPromise = runner.stop();
      await flush();
      expect(cycleFinished).toBe(false);

      jest.advanceTimersByTime(50);
      await flush();
      await stopPromise;
      expect(cycleFinished).toBe(true);
    }
  });

  it('should not start multiple times', () => {
    if (runner) runner.start();
    const loggerWarnSpy = jest.spyOn(Logger.prototype, 'warn');
    if (runner) runner.start();
    expect(loggerWarnSpy).toHaveBeenCalledWith('Outbox runner is already running');
  });

  it('isRunning should reflect correct state', async () => {
    if (runner) {
      expect(runner.isRunning).toBe(false);
      runner.start();
      await waitForCalls(1);
      expect(runner.isRunning).toBe(true);
      await runner.stop();
      expect(runner.isRunning).toBe(false);
    }
  });
});
