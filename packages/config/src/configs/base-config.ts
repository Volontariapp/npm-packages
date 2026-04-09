import { IsDefined, IsEnum, IsNumber, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { NodeEnv } from '../enums/node-env.enum.js';
import { LoggerConfig } from './logger-config.js';
import { LoggerFormat } from '../enums/logger-format.enum.js';

export class BaseConfig {
  @IsEnum(NodeEnv)
  @IsDefined()
  nodeEnv: NodeEnv = NodeEnv.DEVELOPMENT;

  @IsDefined()
  @Type(() => Number)
  @IsNumber()
  port!: number;

  @ValidateNested()
  @Type(() => LoggerConfig)
  @IsDefined()
  logger: LoggerConfig = new LoggerConfig();

  public getLoggerFormat(): LoggerFormat {
    return this.nodeEnv === NodeEnv.PRODUCTION ? LoggerFormat.JSON : LoggerFormat.TEXT;
  }
}
