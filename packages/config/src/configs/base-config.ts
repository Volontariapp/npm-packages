import { IsDefined, IsEnum, IsNumber, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { NodeEnv } from '../enums/node-env.enum.js';
import { LoggerConfig } from './logger-config.js';
import { AuthConfig } from './auth/auth-config.js';
import { LoggerFormat } from '../enums/logger-format.enum.js';

export class BaseConfig {
  @IsEnum(NodeEnv)
  @IsOptional()
  nodeEnv: NodeEnv = NodeEnv.DEVELOPMENT;

  @IsDefined()
  @Type(() => Number)
  @IsNumber()
  port!: number;

  @ValidateNested()
  @Type(() => LoggerConfig)
  @IsOptional()
  logger: LoggerConfig = new LoggerConfig();

  @IsOptional()
  @ValidateNested()
  @Type(() => AuthConfig)
  auth?: AuthConfig;

  public getLoggerFormat(): LoggerFormat {
    if (this.logger.format != null) return this.logger.format;
    return this.nodeEnv === NodeEnv.PRODUCTION ? LoggerFormat.JSON : LoggerFormat.TEXT;
  }
}
