import { IsNumber, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { DBConfig } from './db-config.js';

export class RedisConfig extends DBConfig {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  dbIndex?: number = 0;

  @IsString()
  @IsOptional()
  keyPrefix?: string;
}
