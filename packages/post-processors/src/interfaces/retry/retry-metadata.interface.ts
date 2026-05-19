/**
 * Metadata about a message in the retry system.
 */
export interface RetryMetadata {
  /**
   * Current retry attempt number (0-based).
   */
  attemptCount: number;

  /**
   * Unix timestamp of when this message should be retried.
   */
  nextRetryTimestamp: number;

  /**
   * Error message from last failure.
   */
  lastError?: string;
}
