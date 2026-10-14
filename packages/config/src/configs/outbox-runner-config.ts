import { IsDefined, IsOptional, IsPositive, ValidateNested } from 'class-validator';
import { LoggerConfig } from './logger-config.js';
import { Type } from 'class-transformer';

export class OutboxRunnerConfig {
  @IsDefined()
  @IsPositive()
  batchIntervalMs!: number;

  /**
   * Maximum polling interval (ms) when the outbox is idle.
   * The runner uses exponential backoff from `batchIntervalMs` up to this cap.
   * Defaults to 5 000 ms when not set.
   */
  @IsOptional()
  @IsPositive()
  maxIdleIntervalMs?: number;

  @IsDefined()
  @IsPositive()
  batchSize!: number;

  @IsDefined()
  @ValidateNested()
  @Type(() => LoggerConfig)
  logger!: LoggerConfig;
}
