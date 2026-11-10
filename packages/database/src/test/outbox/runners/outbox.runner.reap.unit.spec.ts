import { describe, expect, it, afterEach, jest } from '@jest/globals';
import { setTimeout } from 'node:timers/promises';
import {
  OutboxRunnerConfig,
  OutboxReapConfig,
  OutboxPurgeConfig,
  LoggerConfig,
  LoggerFormat,
} from '@volontariapp/config';
import type { Logger } from '@volontariapp/logger';
import { OutboxRunner } from '../../../outbox/runners/outbox.runner.js';
import type { OutboxDispatcher } from '../../../outbox/dispatchers/outbox.dispatcher.js';
import type { OutboxModel } from '../../../outbox/models/outbox.model.js';
import type { OutboxEntity } from '../../../outbox/entities/outbox.entity.js';
import type { BaseRepository } from '../../../core/base.repository.js';
import type { OutboxReapReport } from '../../../outbox/reapers/outbox.reaper.js';
import { makeOutboxPusherMock } from '../../utils/helpers/outbox-pusher-mock.helper.js';

interface OutboxRunnerPrivate {
  logger: Logger;
}

type ReapFn = () => Promise<OutboxReapReport>;

describe('OutboxRunner reap (Unit)', () => {
  let runner: OutboxRunner<OutboxModel, OutboxEntity> | undefined;
  let runCycle: jest.Mock<() => Promise<number>>;

  const buildRunner = (
    reap: Partial<OutboxReapConfig> | undefined,
    reapFn: jest.Mock<ReapFn>,
  ): OutboxRunner<OutboxModel, OutboxEntity> => {
    const config = new OutboxRunnerConfig();
    config.batchSize = 10;
    config.batchIntervalMs = 20;
    config.logger = new LoggerConfig();
    config.logger.format = LoggerFormat.TEXT;
    config.logger.level = 'error';
    config.purge = Object.assign(new OutboxPurgeConfig(), { enabled: false });
    if (reap) {
      config.reap = Object.assign(new OutboxReapConfig(), reap);
    }

    const repository = {
      metadata: { tableName: 'outbox' },
    } as unknown as BaseRepository<OutboxModel, OutboxEntity, string>;
    const dispatcher = {} as unknown as OutboxDispatcher<OutboxModel, OutboxEntity>;

    runner = new OutboxRunner(repository, config, dispatcher, makeOutboxPusherMock(), undefined, {
      reap: reapFn,
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

  it('reaps as soon as it starts, then once per interval', async () => {
    const reap = jest.fn<ReapFn>().mockResolvedValue({ stuck: 0, failed: 0 });

    buildRunner({ intervalMs: 40 }, reap).start();
    await setTimeout(130);
    await runner?.stop();

    expect(reap.mock.calls.length).toBeGreaterThanOrEqual(3);
  });

  it('never reaps when the reap is disabled', async () => {
    const reap = jest.fn<ReapFn>().mockResolvedValue({ stuck: 0, failed: 0 });

    buildRunner({ enabled: false, intervalMs: 20 }, reap).start();
    await setTimeout(80);
    await runner?.stop();

    expect(reap).not.toHaveBeenCalled();
  });

  it('logs a failing reap, keeps retrying and keeps sending', async () => {
    const reap = jest.fn<ReapFn>().mockRejectedValue(new Error('connection reset'));
    const started = buildRunner({ intervalMs: 40 }, reap);
    const errorSpy = jest
      .spyOn((started as unknown as OutboxRunnerPrivate).logger, 'error')
      .mockImplementation(() => undefined);

    started.start();
    await setTimeout(130);
    await started.stop();

    expect(reap.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(runCycle.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('reap'),
      expect.objectContaining({ error: expect.any(Error) }),
    );
  });

  it('does not hold back the sending loop while a reap is running', async () => {
    const reap = jest.fn<ReapFn>().mockImplementation(async () => {
      await setTimeout(300);
      return { stuck: 0, failed: 0 };
    });
    const started = buildRunner({ intervalMs: 1000 }, reap);

    started.start();
    await setTimeout(120);

    expect(runCycle.mock.calls.length).toBeGreaterThanOrEqual(3);
    await started.stop();
  });

  it('stops reaping once stopped', async () => {
    const reap = jest.fn<ReapFn>().mockResolvedValue({ stuck: 0, failed: 0 });

    buildRunner({ intervalMs: 30 }, reap).start();
    await setTimeout(70);
    await runner?.stop();
    const callsAtStop = reap.mock.calls.length;
    await setTimeout(100);

    expect(reap.mock.calls.length).toBe(callsAtStop);
  });
});
