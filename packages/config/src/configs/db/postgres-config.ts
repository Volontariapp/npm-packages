import { IsBoolean, IsNumber, IsDefined } from 'class-validator';
import { Type } from 'class-transformer';
import { DBConfig } from './db-config.js';

export class PostgresConfig extends DBConfig {
  @IsDefined()
  @Type(() => Number)
  @IsNumber()
  maxPoolSize!: number;

  @IsDefined()
  @IsBoolean()
  ssl!: boolean;
}
