import { setTimeout } from 'node:timers/promises';
import { Logger } from '@volontariapp/logger';
import type { OutboxRunnerConfig } from '@volontariapp/config';
import { OutboxConsumer } from '../consumers/outbox.consumer.js';
import type { OutboxDispatcher } from '../dispatchers/outbox.dispatcher.js';
import type { OutboxEntity, OutboxModel } from '../index.js';
import type { BaseRepository } from '../../core/base.repository.js';
import type { OutboxPusher } from '../pushers/outbox.pusher.js';
import { OutboxPurger } from '../purgers/outbox.purger.js';
import {
  OUTBOX_COMPANION_TABLES,
  resolveOutboxPurgeSettings,
  type OutboxPurgeSettings,
} from '../purgers/outbox-purge.settings.js';

import { OutboxReaper } from '../reapers/outbox.reaper.js';
import {
  resolveOutboxReapSettings,
  type OutboxReapSettings,
} from '../reapers/outbox-reap.settings.js';

type OutboxPurgeAction = Pick<OutboxPurger, 'purgeCompleted'>;
type OutboxReapAction = Pick<OutboxReaper, 'reap'>;

export class OutboxRunner<TOutboxModel extends OutboxModel, TOutboxEntity extends OutboxEntity> {
  private abortController?: AbortController;
  private loopPromise?: Promise<void>;
  private purgeLoopPromise?: Promise<void>;
  private reapLoopPromise?: Promise<void>;

  private readonly logger: Logger;
  private readonly purgeSettings: OutboxPurgeSettings;
  private readonly reapSettings: OutboxReapSettings;
  private readonly purger?: OutboxPurgeAction;
  private readonly reaper?: OutboxReapAction;
  private readonly consumer: OutboxConsumer<TOutboxModel, TOutboxEntity>;
  private readonly dispatcher: OutboxDispatcher<TOutboxModel, TOutboxEntity>;

  constructor(
    private readonly repository: BaseRepository<TOutboxModel, TOutboxEntity, string>,
    private readonly config: OutboxRunnerConfig,
    dispatcher: OutboxDispatcher<TOutboxModel, TOutboxEntity>,
    pusher: OutboxPusher<TOutboxEntity>,
    purger?: OutboxPurgeAction,
    reaper?: OutboxReapAction,
  ) {
    this.logger = new Logger(config.logger);
    this.dispatcher = dispatcher;
    this.consumer = new OutboxConsumer(
      this.logger,
      this.repository,
      config.batchSize,
      this.dispatcher,
      pusher,
    );

    this.purgeSettings = resolveOutboxPurgeSettings(config.purge);
    if (this.purgeSettings.enabled) {
      this.purger =
        purger ??
        new OutboxPurger(this.logger, this.repository, {
          retentionMs: this.purgeSettings.retentionMs,
          batchSize: this.purgeSettings.batchSize,
          additionalTables: [...(OUTBOX_COMPANION_TABLES[repository.metadata.tableName] ?? [])],
        });
    }

    this.reapSettings = resolveOutboxReapSettings(config.reap);
    this.reaper = reaper;
  }

  /**
   * The default reaper is built when the runner starts, not in the constructor, so a runner
   * built on a stub repository (a consumer's unit test) keeps working until it is started.
   */
  private buildReaper(): OutboxReapAction | undefined {
    if (!this.reapSettings.enabled) {
      return undefined;
    }
    if (this.reaper) {
      return this.reaper;
    }
    try {
      return new OutboxReaper(this.logger, this.repository, {
        stuckAfterMs: this.reapSettings.stuckAfterMs,
        maxAttempts: this.reapSettings.maxAttempts,
        retryBaseMs: this.reapSettings.retryBaseMs,
        limit: this.reapSettings.limit,
        maxAgeMs: this.reapSettings.maxAgeMs,
      });
    } catch (error) {
      this.logger.error('Outbox reap disabled: could not build the reaper', { error });
      return undefined;
    }
  }

  /**
   * Check if the runner is currently active
   */
  public get isRunning(): boolean {
    return !!this.abortController && !this.abortController.signal.aborted;
  }

  start(): void {
    if (this.isRunning) {
      this.logger.warn('Outbox runner is already running');
      return;
    }

    this.logger.info('Starting outbox runner');
    this.abortController = new AbortController();

    // Execute the loop in the background without blocking the caller
    this.loopPromise = this.runLoop(this.abortController.signal);

    // The purge runs on its own loop so that a long delete never holds back the sending.
    if (this.purger) {
      this.purgeLoopPromise = this.runPurgeLoop(this.abortController.signal, this.purger);
    }

    // Same for the reap: it only needs a short statement but must not wait behind a long cycle.
    const reaper = this.buildReaper();
    if (reaper) {
      this.reapLoopPromise = this.runReapLoop(this.abortController.signal, reaper);
    }
  }

  private async runLoop(signal: AbortSignal): Promise<void> {
    const maxIdleMs = this.config.maxIdleIntervalMs ?? 5000;
    let consecutiveEmpty = 0;

    try {
      while (!signal.aborted) {
        const processedItems = await this.runCycle();

        if (processedItems === 0) {
          consecutiveEmpty++;
          // Exponential backoff: base × 2^(n-1), capped at maxIdleIntervalMs
          const delay = Math.min(
            this.config.batchIntervalMs * Math.pow(2, consecutiveEmpty - 1),
            maxIdleMs,
          );
          await setTimeout(delay, undefined, { signal });
        } else {
          consecutiveEmpty = 0;
        }
      }
    } catch (error: unknown) {
      if (this.isAbortError(error)) {
        this.logger.debug('Outbox runner wait interrupted by stop');
      } else {
        this.logger.error('Critical error in outbox runner loop', { error });
      }
    } finally {
      this.logger.info('Outbox runner loop terminated');
    }
  }

  private async runPurgeLoop(signal: AbortSignal, purger: OutboxPurgeAction): Promise<void> {
    try {
      while (!signal.aborted) {
        await this.runPurgeCycle(purger);
        await setTimeout(this.purgeSettings.intervalMs, undefined, { signal });
      }
    } catch (error: unknown) {
      if (this.isAbortError(error)) {
        this.logger.debug('Outbox purge wait interrupted by stop');
      } else {
        this.logger.error('Critical error in outbox purge loop', { error });
      }
    }
  }

  private async runPurgeCycle(purger: OutboxPurgeAction): Promise<void> {
    try {
      await purger.purgeCompleted();
    } catch (error) {
      this.logger.error('Error during outbox purge', { error });
    }
  }

  private async runReapLoop(signal: AbortSignal, reaper: OutboxReapAction): Promise<void> {
    try {
      while (!signal.aborted) {
        await this.runReapCycle(reaper);
        await setTimeout(this.reapSettings.intervalMs, undefined, { signal });
      }
    } catch (error: unknown) {
      if (this.isAbortError(error)) {
        this.logger.debug('Outbox reap wait interrupted by stop');
      } else {
        this.logger.error('Critical error in outbox reap loop', { error });
      }
    }
  }

  private async runReapCycle(reaper: OutboxReapAction): Promise<void> {
    try {
      await reaper.reap();
    } catch (error) {
      this.logger.error('Error during outbox reap', { error });
    }
  }

  private isAbortError(error: unknown): boolean {
    return (
      (error instanceof Error && error.name === 'AbortError') ||
      (error as { code?: string }).code === 'ABORT_ERR'
    );
  }

  async runCycle(): Promise<number> {
    try {
      const items = await this.consumer.fetchPendingItems();
      if (items.length > 0) {
        await this.consumer.processItems(items);
      }
      return items.length;
    } catch (error) {
      this.logger.error('Error during outbox run cycle', { error });
      return 0;
    }
  }

  async stop(): Promise<void> {
    if (!this.abortController) {
      return;
    }

    this.logger.info('Stopping outbox runner gracefully');
    this.abortController.abort();

    try {
      // Wait for the current cycle/wait to actually finish
      await Promise.all([this.loopPromise, this.purgeLoopPromise, this.reapLoopPromise]);
    } finally {
      this.loopPromise = undefined;
      this.purgeLoopPromise = undefined;
      this.reapLoopPromise = undefined;
      this.abortController = undefined;
    }
  }
}
