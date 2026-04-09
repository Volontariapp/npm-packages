import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Type } from 'class-transformer';
import { IsDefined, ValidateNested } from 'class-validator';
import type { INeo4jConfig, IPostgresConfig, IRedisConfig } from '@volontariapp/bridge';
import {
  BaseConfig,
  Neo4jConfig,
  PostgresConfig,
  RedisConfig,
  loadConfig,
} from '@volontariapp/config';

class IntegrationConfig extends BaseConfig {
  @IsDefined()
  @ValidateNested()
  @Type(() => PostgresConfig)
  postgres!: PostgresConfig;

  @IsDefined()
  @ValidateNested()
  @Type(() => Neo4jConfig)
  neo4j!: Neo4jConfig;

  @IsDefined()
  @ValidateNested()
  @Type(() => RedisConfig)
  redis!: RedisConfig;
}

const currentDir = dirname(fileURLToPath(import.meta.url));
const configDir = resolve(currentDir, '../config');
const config = loadConfig(configDir, IntegrationConfig);

export const testDbPostgresConfig: IPostgresConfig = {
  host: config.postgres.host,
  port: config.postgres.port,
  username: config.postgres.username,
  password: config.postgres.password,
  database: config.postgres.database,
  synchronize: true,
  ssl: config.postgres.ssl,
};

export const testDbNeo4jConfig: INeo4jConfig = {
  url: `${config.neo4j.scheme}://${config.neo4j.host}:${String(config.neo4j.port)}`,
  authToken: {
    scheme: config.neo4j.scheme,
    principal: config.neo4j.username,
    credentials: config.neo4j.password,
  },
};

export const testDbRedisConfig: IRedisConfig = {
  host: config.redis.host,
  port: config.redis.port,
  username: config.redis.username,
  db: config.redis.dbIndex,
  keyPrefix: config.redis.keyPrefix,
};
