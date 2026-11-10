import { IsBoolean, IsInt, IsOptional, IsPositive } from 'class-validator';

/**
 * Recovery of the outbox rows that a runner left behind (a crash between the claim and the
 * update, or a failed push). Every field is optional: the runner applies the defaults (reap on,
 * one pass per minute, rows stuck for 5 minutes, 5 attempts, a 30 s retry delay that doubles at
 * each attempt, at most 500 rows per pass, rows created in the last 15 minutes).
 *
 * Delivery becomes "at least once": a row can be pushed twice, so the consumers must be idempotent
 * on the event id (`@volontariapp/post-processors` 3.7.0 and later).
 */
export class OutboxReapConfig {
  /** Set to `false` to never put a row back to PENDING. Defaults to `true`. */
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  /** Delay (ms) between two reap passes. Defaults to 60 000. */
  @IsOptional()
  @IsPositive()
  intervalMs?: number;

  /** A PROCESSING row not updated for this long (ms) is put back to PENDING. Defaults to 300 000. */
  @IsOptional()
  @IsPositive()
  stuckAfterMs?: number;

  /** A FAILED row is retried while `attempts` is below this. Defaults to 5. */
  @IsOptional()
  @IsInt()
  @IsPositive()
  maxAttempts?: number;

  /**
   * Base delay (ms) before a FAILED row is retried: the delay is `retryBaseMs * 2^attempts`.
   * Defaults to 30 000.
   */
  @IsOptional()
  @IsPositive()
  retryBaseMs?: number;

  /** Maximum number of rows put back to PENDING by one statement. Defaults to 500. */
  @IsOptional()
  @IsInt()
  @IsPositive()
  limit?: number;

  /**
   * Only rows created within this delay (ms) are reaped. Older rows are left alone and go through
   * the explicit `requeue` command, so a long outage never replays days of stale events by itself.
   * Defaults to 900 000 (15 minutes).
   */
  @IsOptional()
  @IsPositive()
  maxAgeMs?: number;
}
