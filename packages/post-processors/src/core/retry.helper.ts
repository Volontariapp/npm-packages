import type { Redis } from 'ioredis';
import type { RetryOptions, RetryMetadata } from '../interfaces/index.js';
import type { ParseResult } from '../index.js';

/**
 * Helper class for managing message retries with exponential backoff.
 */
export class RetryHelper {
  private readonly maxRetries: number;
  private readonly initialDelayMs: number;
  private readonly maxDelayMs: number;
  private readonly backoffMultiplier: number;
  private readonly enableDlq: boolean;

  constructor(options: Required<RetryOptions>) {
    this.maxRetries = options.maxRetries;
    this.initialDelayMs = options.initialDelayMs;
    this.maxDelayMs = options.maxDelayMs;
    this.backoffMultiplier = options.backoffMultiplier;
    this.enableDlq = options.enableDlq;
  }

  /**
   * Calculates the delay for a given attempt using exponential backoff.
   * Formula: min(initialDelayMs * (multiplier ^ attemptCount), maxDelayMs)
   */
  calculateDelay(attemptCount: number): number {
    const delay = this.initialDelayMs * Math.pow(this.backoffMultiplier, attemptCount);
    return Math.min(delay, this.maxDelayMs);
  }

  /**
   * Gets the Redis key for storing retry metadata.
   */
  private getRetryKey(groupName: string, messageId: string): string {
    return `retry:post-processor:${groupName}:${messageId}`;
  }

  /**
   * Gets the Redis key for the retry queue (sorted set by next retry timestamp).
   */
  private getRetryQueueKey(groupName: string): string {
    return `retry-queue:post-processor:${groupName}`;
  }

  /**
   * Gets the DLQ stream name.
   */
  getDlqStreamName(streamName: string): string {
    return `${streamName}-dlq`;
  }

  /**
   * Stores or increments retry metadata for a message.
   * Returns the new attempt count.
   */
  async recordRetry(
    redis: Redis,
    groupName: string,
    messageId: string,
    error: Error,
    ttlSeconds: number = 86400,
  ): Promise<number> {
    const key = this.getRetryKey(groupName, messageId);
    const currentAttempt = await redis.incr(`${key}:attempt`);
    await redis.set(`${key}:lastError`, error.message, 'EX', ttlSeconds);
    await redis.expire(key, ttlSeconds);
    return currentAttempt;
  }

  /**
   * Gets retry metadata for a message.
   */
  async getRetryMetadata(
    redis: Redis,
    groupName: string,
    messageId: string,
  ): Promise<RetryMetadata | null> {
    const key = this.getRetryKey(groupName, messageId);
    const attemptCountStr = await redis.get(`${key}:attempt`);

    if (!attemptCountStr) {
      return null;
    }

    const attemptCount = Number(attemptCountStr);
    const delay = this.calculateDelay(attemptCount);
    const nextRetryTimestamp = Date.now() + delay;

    const lastError = (await redis.get(`${key}:lastError`)) ?? undefined;

    return {
      attemptCount,
      nextRetryTimestamp,
      lastError,
    };
  }

  /**
   * Adds a message to the retry queue with scheduled retry timestamp.
   */
  async enqueueForRetry(
    redis: Redis,
    groupName: string,
    messageId: string,
    attemptCount: number,
  ): Promise<void> {
    const queueKey = this.getRetryQueueKey(groupName);
    const delay = this.calculateDelay(attemptCount);
    const retryTimestamp = Date.now() + delay;

    // Add to sorted set with retry timestamp as score
    await redis.zadd(queueKey, retryTimestamp, messageId);
  }

  /**
   * Gets messages from retry queue that are ready to be retried.
   * Returns message IDs that should be re-read from the stream.
   */
  async getReadyForRetry(redis: Redis, groupName: string): Promise<string[]> {
    const queueKey = this.getRetryQueueKey(groupName);
    const now = Date.now();

    // Get all messages with score (timestamp) <= now
    const readyMessages = await redis.zrangebyscore(queueKey, '-inf', now);

    // Remove them from the queue
    if (readyMessages.length > 0) {
      await redis.zrem(queueKey, ...readyMessages);
    }

    return readyMessages;
  }

  /**
   * Checks if a message should be retried or sent to DLQ.
   */
  shouldRetry(attemptCount: number): boolean {
    return attemptCount < this.maxRetries;
  }

  /**
   * Removes all retry metadata for a message (successful processing).
   */
  async clearRetryData(redis: Redis, groupName: string, messageId: string): Promise<void> {
    const key = this.getRetryKey(groupName, messageId);
    const queueKey = this.getRetryQueueKey(groupName);

    await Promise.all([
      redis.del(`${key}:attempt`),
      redis.del(`${key}:lastError`),
      redis.del(key),
      redis.zrem(queueKey, messageId),
    ]);
  }

  /**
   * Sends a failed message to the dead-letter queue.
   */
  async sendToDlq(
    redis: Redis,
    dlqStreamName: string,
    messageId: string,
    originalPayload: ParseResult,
    error: string,
  ): Promise<string> {
    if (!this.enableDlq) {
      return messageId;
    }

    // XADD returns the ID of the added entry
    return (await redis.xadd(
      dlqStreamName,
      '*',
      'messageId',
      messageId,
      'error',
      error,
      'payload',
      JSON.stringify(originalPayload),
      'timestamp',
      String(Date.now()),
    )) as string;
  }

  /**
   * Validates retry options and returns normalized values.
   */
  static normalizeRetryOptions(options?: RetryOptions): Required<RetryOptions> {
    const defaultOptions: Required<RetryOptions> = {
      maxRetries: 5,
      initialDelayMs: 1000,
      maxDelayMs: 60000,
      backoffMultiplier: 2,
      enableDlq: true,
    };

    if (!options) {
      return defaultOptions;
    }

    return {
      maxRetries: options.maxRetries ?? defaultOptions.maxRetries,
      initialDelayMs: options.initialDelayMs ?? defaultOptions.initialDelayMs,
      maxDelayMs: options.maxDelayMs ?? defaultOptions.maxDelayMs,
      backoffMultiplier: options.backoffMultiplier ?? defaultOptions.backoffMultiplier,
      enableDlq: options.enableDlq ?? defaultOptions.enableDlq,
    };
  }
}
