import { OutboxConsumer } from '../consumers/outbox.consumer.js';
import type { OutboxEntity, OutboxModel } from '../index.js';
import { Logger } from '@volontariapp/logger';
import type { OutboxRunnerConfig } from '@volontariapp/config';
import type { BaseRepository } from '../../core/base.repository.js';

export class OutboxRunner<TOutboxModel extends OutboxModel, TOutboxEntity extends OutboxEntity> {
  private running = false;

  private readonly logger: Logger;
  private readonly consumer: OutboxConsumer<TOutboxModel, TOutboxEntity>;

  constructor(
    private readonly repository: BaseRepository<TOutboxModel, TOutboxEntity, string>,
    private readonly config: OutboxRunnerConfig,
  ) {
    this.logger = new Logger(config.logger);
    this.consumer = new OutboxConsumer<TOutboxModel, TOutboxEntity>(
      this.logger,
      this.repository,
      config.batchSize,
    );
  }

  async runCycle(): Promise<void> {
    try {
      await this.consumer.fetchPendingItems();
    } catch (error) {
      this.logger.error('Error during outbox run cycle', { error });
    }
  }

  async start(): Promise<void> {
    if (this.running) {
      this.logger.warn('Outbox runner is already running');
      return;
    }

    this.logger.info('Starting outbox runner');
    this.running = true;

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    while (this.running) {
      await this.runCycle();
      await new Promise((resolve) => setTimeout(resolve, this.config.batchIntervalMs));
    }
  }

  stop(): void {
    this.logger.info('Stopping outbox runner');
    this.running = false;
  }
}
