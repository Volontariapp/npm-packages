import { describe, expect, it, beforeEach, jest, afterEach } from '@jest/globals';
import { OutboxRunner } from '../../../outbox/runners/outbox.runner.js';
import type { OutboxDispatcher } from '../../../outbox/dispatchers/outbox.dispatcher.js';
import type { OutboxModel } from '../../../outbox/models/outbox.model.js';
import type { OutboxEntity } from '../../../outbox/entities/outbox.entity.js';
import type { BaseRepository } from '../../../core/base.repository.js';
import { OutboxRunnerConfig, LoggerConfig, LoggerFormat } from '@volontariapp/config';
import { setTimeout } from 'node:timers/promises';
import { makeOutboxPusherMock } from '../../utils/helpers/outbox-pusher-mock.helper.js';
import type { OutboxConsumer } from '../../../outbox/consumers/outbox.consumer.js';
import type { Logger } from '@volontariapp/logger';

interface MockConsumer {
  fetchPendingItems: jest.Mock<() => Promise<OutboxEntity[]>>;
  processItems: jest.Mock<(items: OutboxEntity[]) => Promise<void>>;
}

interface OutboxRunnerPrivate {
  abortController?: AbortController;
  logger: Logger;
  consumer: MockConsumer;
}

describe('OutboxRunner (Unit)', () => {
  let runner: OutboxRunner<OutboxModel, OutboxEntity>;
  let repositoryMock: jest.Mocked<BaseRepository<OutboxModel, OutboxEntity, string>>;
  let dispatcherMock: jest.Mocked<OutboxDispatcher<OutboxModel, OutboxEntity>>;

  const config = new OutboxRunnerConfig();
  config.batchSize = 10;
  config.batchIntervalMs = 50;
  config.logger = new LoggerConfig();
  config.logger.format = LoggerFormat.TEXT;
  config.logger.level = 'info';

  beforeEach(() => {
    repositoryMock = {} as unknown as jest.Mocked<
      BaseRepository<OutboxModel, OutboxEntity, string>
    >;
    dispatcherMock = {} as unknown as jest.Mocked<OutboxDispatcher<OutboxModel, OutboxEntity>>;
    const pusherMock = makeOutboxPusherMock();

    runner = new OutboxRunner(repositoryMock, config, dispatcherMock, pusherMock);
  });

  afterEach(async () => {
    await runner.stop();
    jest.restoreAllMocks();
  });

  describe('start/stop', () => {
    it('should start the runner and update isRunning', async () => {
      runner.start();
      expect(runner.isRunning).toBe(true);
      await runner.stop();
      expect(runner.isRunning).toBe(false);
    });

    it('should not start if already running', async () => {
      runner.start();
      const privateRunner = runner as unknown as OutboxRunnerPrivate;
      const isRunningBefore = runner.isRunning;
      runner.start();
      expect(runner.isRunning).toBe(isRunningBefore);
      expect(privateRunner.abortController).toBeDefined();
      await runner.stop();
    });
  });

  describe('runCycle', () => {
    it('should delegate to consumer.fetchPendingItems and processItems', async () => {
      const privateRunner = runner as unknown as OutboxRunnerPrivate;
      const consumer = privateRunner.consumer as unknown as OutboxConsumer<
        OutboxModel,
        OutboxEntity
      >;
      const mockItems = [{ id: '1' } as OutboxEntity];

      const fetchSpy = jest.spyOn(consumer, 'fetchPendingItems').mockResolvedValue(mockItems);
      const processSpy = jest.spyOn(consumer, 'processItems').mockResolvedValue();

      await runner.runCycle();

      expect(fetchSpy).toHaveBeenCalled();
      expect(processSpy).toHaveBeenCalledWith(mockItems);
    });
  });

  describe('loop execution', () => {
    it('should execute multiple cycles until stopped', async () => {
      const runCycleSpy = jest.spyOn(runner, 'runCycle').mockResolvedValue();

      runner.start();

      // Wait for at least 2 cycles (interval is 50ms)
      await setTimeout(120);

      await runner.stop();

      // Should have run around 2-3 times
      expect(runCycleSpy.mock.calls.length).toBeGreaterThanOrEqual(2);
    });
  });
});
