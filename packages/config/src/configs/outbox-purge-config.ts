import { IsBoolean, IsOptional, IsPositive } from 'class-validator';

/**
 * Retention of the finished rows of an outbox table. Every field is optional: the runner applies
 * the defaults (purge on, 1 day of retention, one pass per hour, 5 000 rows per batch).
 */
export class OutboxPurgeConfig {
  /** Set to `false` to keep every COMPLETED row. Defaults to `true`. */
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  /** COMPLETED rows older than this (ms) are deleted. Defaults to 86 400 000 (1 day). */
  @IsOptional()
  @IsPositive()
  retentionMs?: number;

  /** Delay (ms) between two purge passes. Defaults to 3 600 000 (1 hour). */
  @IsOptional()
  @IsPositive()
  intervalMs?: number;

  /** Maximum number of rows deleted by one statement. Defaults to 5 000. */
  @IsOptional()
  @IsPositive()
  batchSize?: number;
}
