import { IsEnum, IsOptional, IsString } from 'class-validator';
import { LoggerFormat } from '../enums/logger-format.enum.js';

export class LoggerConfig {
  @IsEnum(LoggerFormat)
  @IsOptional()
  format?: LoggerFormat;

  @IsString()
  @IsOptional()
  level?: string = 'info';
}
