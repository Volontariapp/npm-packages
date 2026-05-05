import { IsDefined, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { BaseDbConfig } from './db-config.js';
import type { IRedisConfig } from '../../interfaces/database.config.interface.js';

export class RedisConfig extends BaseDbConfig implements IRedisConfig {
  @IsDefined()
  @IsNotEmpty()
  @IsString()
  password!: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  dbIndex?: number = 0;

  @IsString()
  @IsOptional()
  keyPrefix?: string;
}
