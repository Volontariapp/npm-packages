import { IsDefined, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { BaseConfig } from './base-config.js';
import { MSURLsConfig } from './ms-urls-config.js';
import { PostgresConfig } from './db/postgres-config.js';
import { RedisConfig } from './db/redis-config.js';
import { Neo4jConfig } from './db/neo4j-config.js';

export class BackendConfig extends BaseConfig {
  @IsDefined()
  @ValidateNested()
  @Type(() => MSURLsConfig)
  microServices!: MSURLsConfig;

  @IsOptional()
  @ValidateNested()
  @Type(() => PostgresConfig)
  db?: PostgresConfig;

  @IsOptional()
  @ValidateNested()
  @Type(() => RedisConfig)
  redis?: RedisConfig;

  @IsOptional()
  @ValidateNested()
  @Type(() => Neo4jConfig)
  neo4j?: Neo4jConfig;
}
