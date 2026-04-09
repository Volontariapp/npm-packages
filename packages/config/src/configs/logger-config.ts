import { IsEnum, IsString, IsDefined, IsNotEmpty } from 'class-validator';
import { LoggerFormat } from '../enums/logger-format.enum.js';

export class LoggerConfig {
  @IsDefined()
  @IsEnum(LoggerFormat)
  format!: LoggerFormat;

  @IsDefined()
  @IsNotEmpty()
  @IsString()
  level!: string;
}
