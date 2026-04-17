import { IsNumber, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { DBConfig } from './db-config.js';
import type { IRedisConfig } from '../../interfaces/database.config.interface.js';

export class RedisConfig extends DBConfig implements IRedisConfig {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  dbIndex?: number = 0;

  @IsString()
  @IsOptional()
  keyPrefix?: string;
}
