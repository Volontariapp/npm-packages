import { IsBoolean, IsNumber, IsDefined } from 'class-validator';
import { Type } from 'class-transformer';
import { DBConfig } from './db-config.js';
import type { IPostgresConfig } from '../../interfaces/database.config.interface.js';

export class PostgresConfig extends DBConfig implements IPostgresConfig {
  @IsDefined()
  @Type(() => Number)
  @IsNumber()
  maxPoolSize!: number;

  @IsDefined()
  @IsBoolean()
  ssl!: boolean;
}
