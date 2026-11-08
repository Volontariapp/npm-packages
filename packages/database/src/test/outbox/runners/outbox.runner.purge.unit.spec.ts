import { describe, expect, it, afterEach, jest } from '@jest/globals';
import { setTimeout } from 'node:timers/promises';
import { OutboxRunnerConfig, OutboxPurgeConfig, LoggerConfig, LoggerFormat } from '@volontariapp/config';
import type { Logger } from '@volontariapp/logger';
import { OutboxRunner } from '../../../outbox/runners/outbox.runner.js';
import type { OutboxDispatcher } from '../../../outbox/dispatchers/outbox.dispatcher.js';
import type { OutboxModel } from '../../../outbox/models/outbox.model.js';
import type { OutboxEntity } from '../../../outbox/entities/outbox.entity.js';
import type { BaseRepository } from '../../../core/base.repository.js';
import type { OutboxPurgeReport } from '../../../outbox/purgers/outbox.purger.js';
import { makeOutboxPusherMock } from '../../utils/helpers/outbox-pusher-mock.helper.js';

interface OutboxRunnerPrivate {
  logger: Logger;
}

type PurgeFn = () => Promise<OutboxPurgeReport>;

describe('OutboxRunner purge (Unit)', () => {
  let runner: OutboxRunner<OutboxModel, OutboxEntity> | undefined;
  let runCycle: jest.Mock<() => Promise<number>>;

  const buildRunner = (
    purge: Partial<OutboxPurgeConfig> | undefined,
    purgeCompleted: jest.Mock<PurgeFn>,
  ): OutboxRunner<OutboxModel, OutboxEntity> => {
    const config = new OutboxRunnerConfig();
    config.batchSize = 10;
    config.batchIntervalMs = 20;
    config.logger = new LoggerConfig();
    config.logger.format = LoggerFormat.TEXT;
    config.logger.level = 'error';
    if (purge) {
      config.purge = Object.assign(new OutboxPurgeConfig(), purge);
    }

    const repository = {
      metadata: { tableName: 'outbox' },
    } as unknown as BaseRepository<OutboxModel, OutboxEntity, string>;
    const dispatcher = {} as unknown as OutboxDispatcher<OutboxModel, OutboxEntity>;

    runner = new OutboxRunner(repository, config, dispatcher, makeOutboxPusherMock(), {
      purgeCompleted,
    });
    runCycle = jest.fn<() => Promise<number>>().mockResolvedValue(0);
    runner.runCycle = runCycle;
    return runner;
  };

  afterEach(async () => {
    await runner?.stop();
    runner = undefined;
    jest.restoreAllMocks();
  });

  it('purges as soon as it starts, then once per interval', async () => {
    const purgeCompleted = jest.fn<PurgeFn>().mockResolvedValue({ outbox: 0 });

    buildRunner({ intervalMs: 40 }, purgeCompleted).start();
    await setTimeout(130);
    await runner?.stop();

    expect(purgeCompleted.mock.calls.length).toBeGreaterThanOrEqual(3);
  });

  it('never purges when the purge is disabled', async () => {
    const purgeCompleted = jest.fn<PurgeFn>().mockResolvedValue({ outbox: 0 });

    buildRunner({ enabled: false, intervalMs: 20 }, purgeCompleted).start();
    await setTimeout(80);
    await runner?.stop();

    expect(purgeCompleted).not.toHaveBeenCalled();
  });

  it('logs a failing purge, keeps retrying and keeps sending', async () => {
    const purgeCompleted = jest.fn<PurgeFn>().mockRejectedValue(new Error('disk full'));
    const started = buildRunner({ intervalMs: 40 }, purgeCompleted);
    const errorSpy = jest
      .spyOn((started as unknown as OutboxRunnerPrivate).logger, 'error')
      .mockImplementation(() => undefined);

    started.start();
    await setTimeout(130);
    await started.stop();

    expect(purgeCompleted.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(runCycle.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('purge'),
      expect.objectContaining({ error: expect.any(Error) }),
    );
  });

  it('does not hold back the sending loop while a purge is running', async () => {
    const purgeCompleted = jest.fn<PurgeFn>().mockImplementation(async () => {
      await setTimeout(300);
      return { outbox: 0 };
    });
    const started = buildRunner({ intervalMs: 1000 }, purgeCompleted);

    started.start();
    await setTimeout(120);

    expect(runCycle.mock.calls.length).toBeGreaterThanOrEqual(3);
    await started.stop();
  });

  it('stops purging once stopped', async () => {
    const purgeCompleted = jest.fn<PurgeFn>().mockResolvedValue({ outbox: 0 });

    buildRunner({ intervalMs: 30 }, purgeCompleted).start();
    await setTimeout(70);
    await runner?.stop();
    const callsAtStop = purgeCompleted.mock.calls.length;
    await setTimeout(100);

    expect(purgeCompleted.mock.calls.length).toBe(callsAtStop);
  });
});
