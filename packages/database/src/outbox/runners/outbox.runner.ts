import { setTimeout } from 'node:timers/promises';
import { Logger } from '@volontariapp/logger';
import type { OutboxRunnerConfig } from '@volontariapp/config';
import { OutboxConsumer } from '../consumers/outbox.consumer.js';
import type { OutboxDispatcher } from '../dispatchers/outbox.dispatcher.js';
import type { OutboxEntity, OutboxModel } from '../index.js';
import type { BaseRepository } from '../../core/base.repository.js';

export class OutboxRunner<TOutboxModel extends OutboxModel, TOutboxEntity extends OutboxEntity> {
  private abortController?: AbortController;
  private loopPromise?: Promise<void>;

  private readonly logger: Logger;
  private readonly consumer: OutboxConsumer<TOutboxModel, TOutboxEntity>;
  private readonly dispatcher: OutboxDispatcher<TOutboxModel, TOutboxEntity>;

  constructor(
    private readonly repository: BaseRepository<TOutboxModel, TOutboxEntity, string>,
    private readonly config: OutboxRunnerConfig,
    dispatcher: OutboxDispatcher<TOutboxModel, TOutboxEntity>,
  ) {
    this.logger = new Logger(config.logger);
    this.dispatcher = dispatcher;
    this.consumer = new OutboxConsumer(
      this.logger,
      this.repository,
      config.batchSize,
      this.dispatcher,
    );
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
  }

  private async runLoop(signal: AbortSignal): Promise<void> {
    try {
      while (!signal.aborted) {
        await this.runCycle();

        // Wait for the next interval or until aborted
        // setTimeout will throw AbortError if signal is aborted during or before the wait
        await setTimeout(this.config.batchIntervalMs, undefined, { signal });
      }
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        this.logger.debug('Outbox runner wait interrupted by stop');
      } else {
        this.logger.error('Critical error in outbox runner loop', { error });
      }
    } finally {
      this.logger.info('Outbox runner loop terminated');
    }
  }

  async runCycle(): Promise<void> {
    try {
      await this.consumer.fetchPendingItems();
    } catch (error) {
      this.logger.error('Error during outbox run cycle', { error });
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
      await this.loopPromise;
    } finally {
      this.loopPromise = undefined;
      this.abortController = undefined;
    }
  }
}
