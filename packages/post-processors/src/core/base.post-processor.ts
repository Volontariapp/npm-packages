import { Logger } from '@volontariapp/logger';
import { hostname } from 'node:os';
import type { Redis } from 'ioredis';
import type { PostProcessorOptions } from '../interfaces/index.js';
import type { RedisStreamEntry, RedisStreamRawResponse } from '../types/index.js';
import { RedisStreamHelper } from './redis-stream.helper.js';

export abstract class BasePostProcessor {
  protected readonly logger: Logger;
  protected readonly options: Required<PostProcessorOptions>;
  private isRunning = false;
  private readPending = true;
  private claimTimeout: NodeJS.Timeout | null = null;
  private loopPromise: Promise<void> | null = null;

  constructor(
    protected readonly redis: Redis,
    options: PostProcessorOptions,
  ) {
    this.logger = new Logger({ context: this.constructor.name });
    const host = hostname();
    this.options = {
      streamName: options.streamName,
      groupName: options.groupName,
      consumerName: options.consumerName ?? `${host}-${this.constructor.name}`,
      batchSize: options.batchSize ?? 10,
      blockMs: options.blockMs ?? 2000,
      claimIntervalMs: options.claimIntervalMs ?? 30000,
      claimMinIdleTimeMs: options.claimMinIdleTimeMs ?? 60000,
      idempotencyTtlSeconds: options.idempotencyTtlSeconds ?? 86400,
    };
  }

  /**
   * Starts the post-processor consumption loop and periodic claim task.
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('Post-processor is already running');
      return;
    }

    this.isRunning = true;
    this.readPending = true;
    this.logger.info('Starting post-processor', {
      streamName: this.options.streamName,
      groupName: this.options.groupName,
      consumerName: this.options.consumerName,
    });

    try {
      await this.ensureConsumerGroup();
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.logger.error('Failed to initialize consumer group', { error });
      this.isRunning = false;
      throw error;
    }

    this.loopPromise = this.runLoop().catch((err: unknown) => {
      const error = err instanceof Error ? err : new Error(String(err));
      this.logger.error('Post-processor loop crashed', { error });
      this.isRunning = false;
    });

    this.startClaimLoop();
  }

  /**
   * Stops the post-processor.
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.logger.info('Stopping post-processor...');
    this.isRunning = false;

    if (this.claimTimeout) {
      clearTimeout(this.claimTimeout);
      this.claimTimeout = null;
    }

    if (this.loopPromise) {
      try {
        await this.loopPromise;
      } catch (err) {
        this.logger.error('Failed to stop post-processor', { error: err });
      }
      this.loopPromise = null;
    }

    this.logger.info('Post-processor stopped');
  }

  /**
   * Template method to process entries. Must be implemented by subclasses.
   */
  protected abstract processEntries(entries: RedisStreamEntry[]): Promise<void>;

  /**
   * Helper to determine if a message should be processed.
   * By default, checks if the event type is processed by this processor.
   */
  protected shouldProcess(_eventType: string): boolean {
    return true;
  }

  /**
   * Acknowledges a message in the consumer group.
   */
  protected async acknowledge(messageId: string): Promise<void> {
    try {
      await this.redis.call('XACK', this.options.streamName, this.options.groupName, messageId);
      this.logger.info('Acknowledged message', { messageId });
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.logger.error('Failed to acknowledge message', { messageId, error });
    }
  }

  /**
   * Ensures the consumer group exists in Redis.
   */
  private async ensureConsumerGroup(): Promise<void> {
    try {
      await this.redis.call(
        'XGROUP',
        'CREATE',
        this.options.streamName,
        this.options.groupName,
        '0',
        'MKSTREAM',
      );
      this.logger.info('Consumer group created', {
        streamName: this.options.streamName,
        groupName: this.options.groupName,
      });
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      if (error.message.includes('BUSYGROUP')) {
        this.logger.debug('Consumer group already exists');
      } else {
        throw error;
      }
    }
  }

  /**
   * Main consumption loop.
   */
  private async runLoop(): Promise<void> {
    while (this.isRunning) {
      try {
        await this.processNextCycle();
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        this.logger.error('Error in post-processor consumption cycle', { error });
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }
  }

  /**
   * Process a single read cycle from Redis stream.
   */
  private async processNextCycle(): Promise<void> {
    const idToRead = this.readPending ? '0' : '>';
    const args = this.buildXreadgroupArgs(idToRead);

    const rawResult = (await this.redis.call(
      'XREADGROUP',
      ...args,
    )) as RedisStreamRawResponse | null;

    if (!rawResult || rawResult.length === 0) {
      this.logger.warn('No raw entries received', {
        idToRead,
        readPending: this.readPending,
        args,
      });
      if (idToRead === '0') this.readPending = false;
      return;
    }

    const rawEntries = rawResult[0][1];
    if (rawEntries.length === 0) {
      this.logger.warn('No raw entries received');
      if (idToRead === '0') this.readPending = false;
      return;
    }

    const entries = RedisStreamHelper.parseRawEntries(rawEntries);
    this.logger.info('Fetched entries from stream', {
      count: entries.length,
      readPending: this.readPending,
    });

    await this.processEntries(entries);
  }

  /**
   * Build arguments array for XREADGROUP command.
   */
  private buildXreadgroupArgs(idToRead: string): (string | number)[] {
    const args: (string | number)[] = [
      'GROUP',
      this.options.groupName,
      this.options.consumerName,
      'COUNT',
      this.options.batchSize,
    ];

    if (idToRead === '>') {
      args.push('BLOCK', this.options.blockMs);
    }

    args.push('STREAMS', this.options.streamName, idToRead);
    return args;
  }

  /**
   * Starts periodic claim task in background.
   */
  private startClaimLoop(): void {
    if (!this.isRunning) return;

    this.claimTimeout = setTimeout(() => {
      this.claimPendingMessages()
        .catch((err: unknown) => {
          const error = err instanceof Error ? err : new Error(String(err));
          this.logger.error('Failed claiming pending messages', { error });
        })
        .finally(() => {
          this.startClaimLoop();
        });
    }, this.options.claimIntervalMs);
  }

  /**
   * Find and claim long-idle pending messages.
   */
  private async claimPendingMessages(): Promise<void> {
    this.logger.debug('Scanning for pending messages to claim');

    const pendingMessages = await RedisStreamHelper.getPendingMessages(
      this.redis,
      this.options.streamName,
      this.options.groupName,
      this.options.batchSize,
    );

    const claimable = pendingMessages.filter(
      (msg) =>
        msg.consumerName !== this.options.consumerName &&
        msg.idleTimeMs >= this.options.claimMinIdleTimeMs,
    );

    if (claimable.length === 0) return;

    this.logger.info('Claiming idle pending messages', {
      count: claimable.length,
      messageIds: claimable.map((c) => c.messageId),
    });

    const claimedCount = await this.claimMessagesList(claimable.map((c) => c.messageId));
    if (claimedCount > 0) {
      this.readPending = true;
    }
  }

  /**
   * Claim list of message IDs sequentially.
   */
  private async claimMessagesList(messageIds: string[]): Promise<number> {
    let claimedCount = 0;
    for (const id of messageIds) {
      try {
        await RedisStreamHelper.claimMessage(
          this.redis,
          this.options.streamName,
          this.options.groupName,
          this.options.consumerName,
          this.options.claimMinIdleTimeMs,
          id,
        );
        claimedCount++;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        this.logger.error('Failed to claim message', { messageId: id, error });
      }
    }
    return claimedCount;
  }
}
