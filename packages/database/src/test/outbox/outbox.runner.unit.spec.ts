import { describe, expect, it, beforeEach, jest, afterEach } from '@jest/globals';
import { OutboxRunner } from '../../outbox/runners/outbox.runner.js';
import type { OutboxConsumer } from '../../outbox/consumers/outbox.consumer.js';
import type { OutboxModel } from '../../outbox/models/outbox.model.js';
import type { OutboxEntity } from '../../outbox/entities/outbox.entity.js';
import { makeLoggerMock, type TestLoggerMock } from '../utils/helpers/logger-mock.helper.js';

describe('OutboxRunner (Unit)', () => {
  let runner: OutboxRunner<OutboxModel, OutboxEntity>;
  let consumerMock: jest.Mocked<OutboxConsumer<OutboxModel, OutboxEntity>>;
  let loggerMock: TestLoggerMock;

  beforeEach(() => {
    jest.useFakeTimers();
    loggerMock = makeLoggerMock();
    consumerMock = {
      fetchPendingItems: jest.fn<() => Promise<OutboxEntity[]>>(),
    } as unknown as jest.Mocked<OutboxConsumer<OutboxModel, OutboxEntity>>;

    runner = new OutboxRunner(loggerMock as never, consumerMock, 200);
  });

  afterEach(() => {
    runner.stop();
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('should call fetchPendingItems periodically after start', async () => {
    consumerMock.fetchPendingItems.mockResolvedValue([]);

    void runner.start();

    // The loop in start() calls runCycle() which calls fetchPendingItems()
    // We need to advance time to trigger multiple cycles
    await jest.advanceTimersByTimeAsync(0);
    expect(consumerMock.fetchPendingItems).toHaveBeenCalledTimes(1);

    await jest.advanceTimersByTimeAsync(200);
    expect(consumerMock.fetchPendingItems).toHaveBeenCalledTimes(2);

    await jest.advanceTimersByTimeAsync(200);
    expect(consumerMock.fetchPendingItems).toHaveBeenCalledTimes(3);
  });

  it('runCycle() should execute a single fetch and return', async () => {
    consumerMock.fetchPendingItems.mockResolvedValue([]);

    await runner.runCycle();

    expect(consumerMock.fetchPendingItems).toHaveBeenCalledTimes(1);
    // Should not loop or wait
    expect(jest.getTimerCount()).toBe(0);
  });

  it('should log error if runCycle fails but continue running in start loop', async () => {
    const error = new Error('Fetch failed');
    consumerMock.fetchPendingItems.mockRejectedValueOnce(error);
    consumerMock.fetchPendingItems.mockResolvedValue([]);

    void runner.start();

    await jest.advanceTimersByTimeAsync(0);
    expect(loggerMock.error).toHaveBeenCalledWith('Error during outbox run cycle', { error });
    expect(consumerMock.fetchPendingItems).toHaveBeenCalledTimes(1);

    await jest.advanceTimersByTimeAsync(200);
    expect(consumerMock.fetchPendingItems).toHaveBeenCalledTimes(2);
  });

  it('should stop running when stop is called', async () => {
    consumerMock.fetchPendingItems.mockResolvedValue([]);

    void runner.start();
    await jest.advanceTimersByTimeAsync(0);
    expect(consumerMock.fetchPendingItems).toHaveBeenCalledTimes(1);

    runner.stop();
    await jest.advanceTimersByTimeAsync(200);

    // Should not have been called a second time
    expect(consumerMock.fetchPendingItems).toHaveBeenCalledTimes(1);
  });

  it('should not start multiple times', () => {
    void runner.start();
    void runner.start();

    expect(loggerMock.warn).toHaveBeenCalledWith('Outbox runner is already running');
  });
});
