import type { OutboxConsumer } from '../consumers/outbox.consumer.js';
import type { OutboxEntity, OutboxModel } from '../index.js';
import type { Logger } from '@volontariapp/logger';

export class OutboxRunner<TOutboxModel extends OutboxModel, TOutboxEntity extends OutboxEntity> {
  private running = false;

  constructor(
    private readonly logger: Logger,
    private readonly consumer: OutboxConsumer<TOutboxModel, TOutboxEntity>,
    private readonly interval = 200,
  ) {}

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
      await new Promise((resolve) => setTimeout(resolve, this.interval));
    }
  }

  stop(): void {
    this.logger.info('Stopping outbox runner');
    this.running = false;
  }
}
