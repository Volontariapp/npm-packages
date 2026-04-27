import { describe, expect, it, beforeEach, jest, afterEach } from '@jest/globals';
import { OutboxRunner } from '../../outbox/runners/outbox.runner.js';
import { OutboxConsumer } from '../../outbox/consumers/outbox.consumer.js';
import { OutboxRunnerConfig, LoggerConfig, LoggerFormat } from '@volontariapp/config';
import type { OutboxModel } from '../../outbox/models/outbox.model.js';
import type { OutboxEntity } from '../../outbox/entities/outbox.entity.js';
import type { BaseRepository } from '../../core/base.repository.js';
import { Logger } from '@volontariapp/logger';

jest.mock('@volontariapp/logger');

describe('OutboxRunner (Unit)', () => {
  let runner: OutboxRunner<OutboxModel, OutboxEntity>;
  let repositoryMock: jest.Mocked<BaseRepository<OutboxModel, OutboxEntity, string>>;
  let fetchPendingItemsSpy: jest.SpiedFunction<
    OutboxConsumer<OutboxModel, OutboxEntity>['fetchPendingItems']
  >;
  let loggerErrorSpy: jest.SpiedFunction<Logger['error']>;
  let loggerWarnSpy: jest.SpiedFunction<Logger['warn']>;

  const config = new OutboxRunnerConfig();
  config.batchIntervalMs = 200;
  config.batchSize = 10;
  config.logger = new LoggerConfig();
  config.logger.format = LoggerFormat.JSON;
  config.logger.level = 'info';

  beforeEach(() => {
    jest.useFakeTimers();

    repositoryMock = {
      metadata: { tableName: 'outbox' },
    } as unknown as jest.Mocked<BaseRepository<OutboxModel, OutboxEntity, string>>;

    // Spy on the prototype because OutboxRunner instantiates its own consumer
    fetchPendingItemsSpy = jest.spyOn(
      OutboxConsumer.prototype,
      'fetchPendingItems',
    ) as jest.SpiedFunction<OutboxConsumer<OutboxModel, OutboxEntity>['fetchPendingItems']>;

    // Logger is mocked via jest.mock
    loggerErrorSpy = jest.spyOn(Logger.prototype, 'error') as jest.SpiedFunction<Logger['error']>;
    loggerWarnSpy = jest.spyOn(Logger.prototype, 'warn') as jest.SpiedFunction<Logger['warn']>;

    runner = new OutboxRunner(repositoryMock, config);
  });

  afterEach(() => {
    runner.stop();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('should call fetchPendingItems periodically after start', async () => {
    fetchPendingItemsSpy.mockResolvedValue([]);

    void runner.start();

    // The loop in start() calls runCycle() which calls fetchPendingItems()
    // We need to advance time to trigger multiple cycles
    await jest.advanceTimersByTimeAsync(0);
    expect(fetchPendingItemsSpy).toHaveBeenCalledTimes(1);

    await jest.advanceTimersByTimeAsync(200);
    expect(fetchPendingItemsSpy).toHaveBeenCalledTimes(2);

    await jest.advanceTimersByTimeAsync(200);
    expect(fetchPendingItemsSpy).toHaveBeenCalledTimes(3);
  });

  it('runCycle() should execute a single fetch and return', async () => {
    fetchPendingItemsSpy.mockResolvedValue([]);

    await runner.runCycle();

    expect(fetchPendingItemsSpy).toHaveBeenCalledTimes(1);
    // Should not loop or wait
    expect(jest.getTimerCount()).toBe(0);
  });

  it('should log error if runCycle fails but continue running in start loop', async () => {
    const error = new Error('Fetch failed');
    fetchPendingItemsSpy.mockRejectedValueOnce(error);
    fetchPendingItemsSpy.mockResolvedValue([]);

    void runner.start();

    await jest.advanceTimersByTimeAsync(0);
    expect(loggerErrorSpy).toHaveBeenCalledWith('Error during outbox run cycle', { error });
    expect(fetchPendingItemsSpy).toHaveBeenCalledTimes(1);

    await jest.advanceTimersByTimeAsync(200);
    expect(fetchPendingItemsSpy).toHaveBeenCalledTimes(2);
  });

  it('should stop running when stop is called', async () => {
    fetchPendingItemsSpy.mockResolvedValue([]);

    void runner.start();
    await jest.advanceTimersByTimeAsync(0);
    expect(fetchPendingItemsSpy).toHaveBeenCalledTimes(1);

    runner.stop();
    await jest.advanceTimersByTimeAsync(200);

    // Should not have been called a second time
    expect(fetchPendingItemsSpy).toHaveBeenCalledTimes(1);
  });

  it('should not start multiple times', () => {
    void runner.start();
    void runner.start();

    expect(loggerWarnSpy).toHaveBeenCalledWith('Outbox runner is already running');
  });
});
