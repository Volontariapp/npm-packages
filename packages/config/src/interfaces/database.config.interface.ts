import type { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions.js';
import type { Config as Neo4jDriverConfig } from 'neo4j-driver';
import type { RedisOptions } from 'ioredis';

export interface IPostgresConfig extends Omit<PostgresConnectionOptions, 'type'> {
  host: string;
  port: number;
  username: string;
  password?: string;
  database: string;
}

export interface INeo4jAuthToken {
  scheme?: string;
  principal: string;
  credentials: string;
  realm?: string;
}

export interface INeo4jConfig {
  url: string;
  authToken: INeo4jAuthToken;
  config?: Neo4jDriverConfig;
}

export interface IRedisConfig extends RedisOptions {
  host: string;
  port: number;
}
