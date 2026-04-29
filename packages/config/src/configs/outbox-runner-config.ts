import { IsDefined, IsPositive, ValidateNested } from 'class-validator';
import { LoggerConfig } from './logger-config.js';
import { Type } from 'class-transformer';

export class OutboxRunnerConfig {
  @IsDefined()
  @IsPositive()
  batchIntervalMs!: number;

  @IsDefined()
  @IsPositive()
  batchSize!: number;

  @IsDefined()
  @ValidateNested()
  @Type(() => LoggerConfig)
  logger!: LoggerConfig;
}
