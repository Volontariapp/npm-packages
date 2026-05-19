import type { RetryOptions } from './retry-options.interface.js';

export interface PostProcessorOptions {
  /**
   * The Redis Stream name to read from (e.g. 'stream:user').
   */
  streamName: string;

  /**
   * The name of the Consumer Group.
   */
  groupName: string;

  /**
   * The name of the consumer instance.
   * Defaults to hostname.
   */
  consumerName?: string;

  /**
   * Maximum number of messages to process in a single batch.
   * @default 10
   */
  batchSize?: number;

  /**
   * Block duration in milliseconds for XREADGROUP.
   * @default 2000
   */
  blockMs?: number;

  /**
   * Interval in milliseconds at which to check for pending messages to claim.
   * @default 30000
   */
  claimIntervalMs?: number;

  /**
   * Minimum idle time in milliseconds before claiming pending messages.
   * @default 60000
   */
  claimMinIdleTimeMs?: number;

  /**
   * Time-to-live in seconds for message idempotency keys in Redis.
   * Set to 0 to disable idempotence checking.
   * @default 86400 (24 hours)
   */
  idempotencyTtlSeconds?: number;

  /**
   * Retry options with exponential backoff configuration.
   * @default { maxRetries: 5, initialDelayMs: 1000, maxDelayMs: 60000, backoffMultiplier: 2, enableDlq: true }
   */
  retry?: RetryOptions;
}
