import { Logger } from '@volontariapp/logger';
import os from 'node:os';
import v8 from 'node:v8';
import type { Redis } from 'ioredis';
import type {
  PostProcessorOptions,
  NormalizedPostProcessorOptions,
  CircuitBreakerConfig,
} from '../../interfaces/index.js';
import type { ParseResult, RedisStreamEntry, RedisStreamRawResponse } from '../../types/index.js';
import { RedisStreamHelper } from '../helpers/redis-stream.helper.js';
import { RetryHelper } from '../helpers/retry.helper.js';
import { DEFAULT_POST_PROCESSOR_CONFIG } from '../../constants/index.js';
import { isInfrastructureError } from '@volontariapp/errors';
import { OptionsValidator } from '../validators/options-validator.js';
import { CircuitBreaker } from '../validators/circuit-breaker.js';
import type { EventMessagingType } from '@volontariapp/messaging';
import { StreamMetrics } from '../metrics/stream-metrics.js';

export abstract class BasePostProcessor<EventType extends EventMessagingType> {
  protected readonly logger: Logger;
  protected readonly options: NormalizedPostProcessorOptions;
  protected readonly retryHelper: RetryHelper;
  protected readonly circuitBreaker: CircuitBreaker;
  protected readonly blockingRedis: Redis;
  protected readonly streamMetrics: StreamMetrics;
  private isRunning = false;
  private readPending = true;
  private readPendingDueAt: number | null = null;
  private claimTimeout: NodeJS.Timeout | null = null;
  private retryLoopTimeout: NodeJS.Timeout | null = null;
  private dlqSyncTimeout: NodeJS.Timeout | null = null;
  private loopPromise: Promise<void> | null = null;
  private stopPromise: Promise<void> | null = null;
  private currentBatchSize: number;

  private readonly sigtermHandler = () => {
    void this.handleShutdown('SIGTERM');
  };
  private readonly sigintHandler = () => {
    void this.handleShutdown('SIGINT');
  };

  constructor(
    protected readonly redis: Redis,
    options: PostProcessorOptions,
  ) {
    if (typeof redis.call !== 'function') {
      throw new Error('Invalid Redis instance: must support .call command execution');
    }

    this.logger = new Logger({ context: this.constructor.name });
    const host = os.hostname();

    this.options = {
      ...DEFAULT_POST_PROCESSOR_CONFIG,
      streamName: options.streamName,
      groupName: options.groupName,
      batchSize: options.batchSize ?? DEFAULT_POST_PROCESSOR_CONFIG.batchSize,
      blockMs: options.blockMs ?? DEFAULT_POST_PROCESSOR_CONFIG.blockMs,
      claimIntervalMs: options.claimIntervalMs ?? DEFAULT_POST_PROCESSOR_CONFIG.claimIntervalMs,
      claimMinIdleTimeMs:
        options.claimMinIdleTimeMs ?? DEFAULT_POST_PROCESSOR_CONFIG.claimMinIdleTimeMs,
      idempotencyTtlSeconds:
        options.idempotencyTtlSeconds ?? DEFAULT_POST_PROCESSOR_CONFIG.idempotencyTtlSeconds,
      handleSignals: options.handleSignals ?? DEFAULT_POST_PROCESSOR_CONFIG.handleSignals,
      circuitBreaker: options.circuitBreaker ?? DEFAULT_POST_PROCESSOR_CONFIG.circuitBreaker,
      consumerName: options.consumerName ?? `${host}-${this.constructor.name}`,
      retry: RetryHelper.normalizeRetryOptions(
        options.retry ?? DEFAULT_POST_PROCESSOR_CONFIG.retry,
      ),
      dynamicBatching: {
        ...DEFAULT_POST_PROCESSOR_CONFIG.dynamicBatching,
        ...options.dynamicBatching,
      },
    };
    OptionsValidator.validate(this.options);
    this.retryHelper = new RetryHelper(this.options.retry);
    this.circuitBreaker = new CircuitBreaker(
      this.options.circuitBreaker as Required<CircuitBreakerConfig>,
    );
    this.currentBatchSize = this.options.batchSize;
    this.blockingRedis = redis.duplicate();
    this.streamMetrics = new StreamMetrics({
      redis,
      streamName: this.options.streamName,
      groupName: this.options.groupName,
      dlqStreamName: this.options.retry.enableDlq
        ? this.retryHelper.getDlqStreamName(this.options.streamName)
        : null,
    });
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

    this.setupSignalHandlers();
    this.streamMetrics.register();

    this.loopPromise = this.runLoop().catch((err: unknown) => {
      const error = err instanceof Error ? err : new Error(String(err));
      this.logger.error('Post-processor loop crashed', { error });
      this.isRunning = false;
    });

    this.startClaimLoop();
    this.startRetryLoop();
    this.startDlqSyncLoop();
  }

  /**
   * Gets the current batch size (possibly adjusted by dynamic batching).
   */
  getCurrentBatchSize(): number {
    return this.currentBatchSize;
  }

  /**
   * Gets the logger instance for testing and debugging.
   */
  getLogger(): Logger {
    return this.logger;
  }

  /**
   * Stops the post-processor. Every call made while a stop is in progress returns the same
   * promise, so a caller awaiting `stop()` always waits for the end of the consumption loop,
   * even when another caller (a signal listener) started the stop first.
   */
  stop(): Promise<void> {
    if (this.stopPromise) {
      return this.stopPromise;
    }
    if (!this.isRunning) {
      return Promise.resolve();
    }

    this.stopPromise = this.doStop().finally(() => {
      this.stopPromise = null;
    });
    return this.stopPromise;
  }

  private async doStop(): Promise<void> {
    this.logger.info('Stopping post-processor...');
    this.isRunning = false;

    this.streamMetrics.unregister();
    this.cleanupSignalHandlers();

    if (this.claimTimeout) {
      clearTimeout(this.claimTimeout);
      this.claimTimeout = null;
    }

    if (this.retryLoopTimeout) {
      clearTimeout(this.retryLoopTimeout);
      this.retryLoopTimeout = null;
    }

    if (this.dlqSyncTimeout) {
      clearTimeout(this.dlqSyncTimeout);
      this.dlqSyncTimeout = null;
    }

    if (this.loopPromise) {
      try {
        await this.loopPromise;
      } catch (err) {
        this.logger.error('Failed to stop post-processor', { error: err });
      }
      this.loopPromise = null;
    }

    try {
      this.blockingRedis.disconnect();
    } catch (err) {
      this.logger.error('Failed to disconnect blocking Redis', { error: err });
    }

    this.logger.info('Post-processor stopped');
  }

  private setupSignalHandlers(): void {
    if (!this.options.handleSignals) {
      return;
    }
    process.on('SIGTERM', this.sigtermHandler);
    process.on('SIGINT', this.sigintHandler);
  }

  private cleanupSignalHandlers(): void {
    process.off('SIGTERM', this.sigtermHandler);
    process.off('SIGINT', this.sigintHandler);
  }

  private async handleShutdown(signal: string): Promise<void> {
    this.logger.info(`Received ${signal}, initiating graceful shutdown...`);
    try {
      await this.stop();
    } catch (err) {
      this.logger.error('Error during graceful shutdown', { error: err });
    }
  }

  /**
   * Template method to process entries. Must be implemented by subclasses.
   */
  protected abstract processEntries(entries: RedisStreamEntry[]): Promise<void>;

  /**
   * Helper to determine if a message should be processed.
   * By default, checks if the event type is processed by this processor.
   */
  protected shouldProcess(_eventType: EventType): boolean {
    return true;
  }

  /**
   * Keeps messages pending after an infrastructure error (database or Redis unavailable):
   * no acknowledgement, no retry attempt counted, no DLQ. The failure is not caused by the
   * message itself, so it must not consume its retry budget.
   */
  protected deferInfrastructureRetry(messageIds: string[], error: Error): void {
    for (const messageId of messageIds) {
      this.logger.warn('Infrastructure error, message kept pending', {
        streamName: this.options.streamName,
        messageId,
        error,
      });
    }
    this.scheduleReadPending();
  }

  /**
   * Keeps pending a message whose event is being processed by another delivery (same event id,
   * pushed twice by the outbox): no acknowledgement, no retry attempt counted. The message is
   * read again later and acknowledged once the other delivery has marked the event done, or
   * processed if its lock expired without being marked done.
   */
  protected deferLockedMessage(messageId: string, idempotencyId: string): void {
    this.logger.warn('Event is being processed by another delivery, message kept pending', {
      streamName: this.options.streamName,
      messageId,
      eventId: idempotencyId,
    });
    this.scheduleReadPending();
  }

  /**
   * Lifetime of the "processing" idempotency lock: the idle time after which a pending message
   * is claimed by another consumer. A consumer that dies while processing releases the event
   * when it is claimed again.
   */
  protected get processingLockTtlSeconds(): number {
    return Math.max(1, Math.ceil(this.options.claimMinIdleTimeMs / 1000));
  }

  /**
   * Plans a re-read of the pending messages. Kept in memory on purpose: it must work when
   * Redis itself is the failing component.
   */
  private scheduleReadPending(): void {
    this.readPendingDueAt = Date.now() + this.options.claimIntervalMs;
  }

  /**
   * Re-reads the pending messages when the delay planned by scheduleReadPending is over.
   */
  private releaseReadPendingWhenDue(): void {
    if (this.readPendingDueAt !== null && Date.now() >= this.readPendingDueAt) {
      this.readPendingDueAt = null;
      this.readPending = true;
    }
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
   * Acknowledges multiple messages in the consumer group.
   */
  protected async acknowledgeMany(messageIds: string[]): Promise<void> {
    if (messageIds.length === 0) return;
    try {
      await this.redis.call('XACK', this.options.streamName, this.options.groupName, ...messageIds);
      this.logger.info('Acknowledged messages', { count: messageIds.length, messageIds });
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.logger.error('Failed to acknowledge messages', { messageIds, error });
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
        if (!this.circuitBreaker.isAllowed()) {
          this.logger.warn('Circuit breaker is OPEN. Suspending message processing.');
          await new Promise((resolve) => setTimeout(resolve, 1000));
          continue;
        }
        await this.processNextCycle();
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        this.logger.error('Error in post-processor consumption cycle', { error });
        if (isInfrastructureError(error)) {
          this.scheduleReadPending();
        }
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

    if (idToRead === '0') {
      this.readPending = false;
    }

    const rawResult = (await this.blockingRedis.call(
      'XREADGROUP',
      ...args,
    )) as RedisStreamRawResponse | null;

    if (!rawResult || rawResult.length === 0) {
      this.logger.debug('No entries in stream (idle)');
      if (idToRead === '0') this.readPending = false;
      return;
    }

    const rawEntries = rawResult[0][1];
    if (rawEntries.length === 0) {
      this.logger.debug('Stream returned empty batch');
      if (idToRead === '0') this.readPending = false;
      return;
    }

    const entries = RedisStreamHelper.parseRawEntries(rawEntries);
    this.logger.info('Fetched entries from stream', {
      count: entries.length,
      readPending: this.readPending,
    });

    const startTime = Date.now();
    try {
      await this.processEntries(entries);
      const latency = Date.now() - startTime;
      this.adjustBatchSize(latency);
    } catch (err) {
      const latency = Date.now() - startTime;
      this.adjustBatchSize(latency);
      throw err;
    }
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
      this.currentBatchSize,
    ];

    if (idToRead === '>') {
      args.push('BLOCK', this.options.blockMs);
    }

    args.push('STREAMS', this.options.streamName, idToRead);
    return args;
  }

  private adjustBatchSize(latencyMs: number): void {
    if (!this.options.dynamicBatching.enabled) {
      return;
    }

    const config = this.options.dynamicBatching;
    const minSize = config.minBatchSize ?? 1;
    const maxSize = config.maxBatchSize ?? this.options.batchSize;
    const targetLatency = config.targetLatencyMs ?? 1000;

    // 1. Memory pressure check
    const heapStats = v8.getHeapStatistics();
    const memoryPressure = heapStats.used_heap_size / heapStats.heap_size_limit;

    if (memoryPressure > 0.85) {
      this.currentBatchSize = minSize;
      this.logger.warn('High memory pressure detected, dropping batch size to minimum', {
        memoryPressure,
        currentBatchSize: this.currentBatchSize,
      });
      return;
    }

    // 2. CPU load check
    const systemLoad = os.loadavg()[0];
    const cpuCount = os.cpus().length;
    const cpuPressure = systemLoad / cpuCount;

    if (cpuPressure > 1.2) {
      this.currentBatchSize = Math.max(minSize, Math.floor(this.currentBatchSize * 0.7));
      this.logger.warn('High CPU load detected, reducing batch size', {
        cpuPressure,
        currentBatchSize: this.currentBatchSize,
      });
      return;
    }

    // 3. Latency check
    const previousSize = this.currentBatchSize;
    if (latencyMs > targetLatency) {
      this.currentBatchSize = Math.max(minSize, Math.floor(this.currentBatchSize * 0.8));
      if (this.currentBatchSize !== previousSize) {
        this.logger.info('Reducing batch size due to high latency', {
          latencyMs,
          targetLatency,
          previousSize,
          currentBatchSize: this.currentBatchSize,
        });
      }
    } else {
      this.currentBatchSize = Math.min(maxSize, this.currentBatchSize + 1);
      if (this.currentBatchSize !== previousSize) {
        this.logger.debug('Increasing batch size due to low latency', {
          latencyMs,
          targetLatency,
          previousSize,
          currentBatchSize: this.currentBatchSize,
        });
      }
    }
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
    if (!this.circuitBreaker.isAllowed()) {
      this.logger.warn('Circuit breaker is OPEN. Skipping claim cycle.');
      return;
    }

    this.logger.debug('Scanning for pending messages to claim');

    const pendingMessages = await RedisStreamHelper.getPendingMessages(
      this.redis,
      this.options.streamName,
      this.options.groupName,
      this.currentBatchSize,
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

  /**
   * Starts periodic retry loop in background.
   * Checks for messages ready to be retried and re-reads them from the stream.
   */
  private startRetryLoop(): void {
    if (!this.isRunning) return;

    this.retryLoopTimeout = setTimeout(() => {
      this.processRetryQueue()
        .catch((err: unknown) => {
          const error = err instanceof Error ? err : new Error(String(err));
          this.logger.error('Failed processing retry queue', { error });
        })
        .finally(() => {
          this.startRetryLoop();
        });
    }, this.options.claimIntervalMs);
  }

  /**
   * Processes messages from the retry queue.
   */
  private async processRetryQueue(): Promise<void> {
    this.releaseReadPendingWhenDue();

    if (!this.circuitBreaker.isAllowed()) {
      this.logger.warn('Circuit breaker is OPEN. Skipping retry queue processing.');
      return;
    }

    const readyMessages = await this.retryHelper.getReadyForRetry(
      this.redis,
      this.options.groupName,
    );

    if (readyMessages.length === 0) return;

    this.logger.info('Found ready-to-retry messages', {
      count: readyMessages.length,
      messageIds: readyMessages.slice(0, 10), // log first 10
    });

    // Mark as pending to re-read these messages from the stream
    this.readPending = true;
  }

  /**
   * Starts periodic DLQ sync loop in background.
   * Removes DLQ entries after a retention period.
   */
  private startDlqSyncLoop(): void {
    if (!this.isRunning) return;

    this.dlqSyncTimeout = setTimeout(() => {
      this.syncDlqRetention()
        .catch((err: unknown) => {
          const error = err instanceof Error ? err : new Error(String(err));
          this.logger.error('Failed syncing DLQ retention', { error });
        })
        .finally(() => {
          this.startDlqSyncLoop();
        });
    }, this.options.claimIntervalMs * 10); // Less frequent than retry loop
  }

  /**
   * Maintains DLQ retention by removing old entries.
   */
  private async syncDlqRetention(): Promise<void> {
    if (!this.options.retry.enableDlq) return;

    const dlqStreamName = this.retryHelper.getDlqStreamName(this.options.streamName);
    const retentionMs = this.options.idempotencyTtlSeconds * 1000;
    const cutoffTime = Date.now() - retentionMs;

    try {
      // Get all entries and filter old ones
      const entries = (await this.redis.xrange(dlqStreamName, '-', '+')) as [string, string[]][];

      const idsToRemove = entries
        .filter((entry) => {
          const timestamp = Number(entry[0].split('-')[0]);
          return timestamp < cutoffTime;
        })
        .map((entry) => entry[0]);

      if (idsToRemove.length > 0) {
        await this.redis.xdel(dlqStreamName, ...idsToRemove);
        this.logger.info('Cleaned up DLQ entries', { count: idsToRemove.length });
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.logger.error('Failed to clean DLQ', { error });
    }
  }

  /**
   * Helper to send a message to the dead-letter queue.
   * Called by subclasses when a message is beyond max retries.
   */
  protected async sendMessageToDlq(
    messageId: string,
    originalPayload: ParseResult,
    error: string,
  ): Promise<void> {
    if (!this.options.retry.enableDlq) return;

    try {
      const dlqStreamName = this.retryHelper.getDlqStreamName(this.options.streamName);
      await this.retryHelper.sendToDlq(
        this.redis,
        dlqStreamName,
        messageId,
        originalPayload,
        error,
      );
      this.streamMetrics.recordDlqSent();
      this.logger.error('Message sent to DLQ', { messageId, dlqStreamName, error });
    } catch (err) {
      const dlqError = err instanceof Error ? err : new Error(String(err));
      this.logger.error('Failed to send message to DLQ', { messageId, error: dlqError });
    }
  }
}
