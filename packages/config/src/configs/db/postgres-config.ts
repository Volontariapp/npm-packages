import { IsBoolean, IsNumber, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { DBConfig } from './db-config.js';

export class PostgresConfig extends DBConfig {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxPoolSize?: number = 10;

  @IsOptional()
  @IsBoolean()
  ssl?: boolean = false;
}
