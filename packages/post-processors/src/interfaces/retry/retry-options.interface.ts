/**
 * Configuration options for retry behavior with exponential backoff.
 */
export interface RetryOptions {
  /**
   * Maximum number of retry attempts for a failed message.
   * @default 5
   */
  maxRetries?: number;

  /**
   * Initial delay in milliseconds before first retry.
   * @default 1000 (1 second)
   */
  initialDelayMs?: number;

  /**
   * Maximum delay in milliseconds between retries.
   * @default 60000 (1 minute)
   */
  maxDelayMs?: number;

  /**
   * Exponential backoff multiplier.
   * Next delay = min(current delay * multiplier, maxDelayMs)
   * @default 2
   */
  backoffMultiplier?: number;

  /**
   * Whether to enable dead-letter queue (DLQ) for permanently failed messages.
   * Failed messages after maxRetries are sent to `{streamName}-dlq` stream.
   * @default true
   */
  enableDlq?: boolean;
}
