export const HEALTH_CONFIG = Symbol('HEALTH_CONFIG');

export interface RedisHealthOptions {
  host: string;
  port: number;
}

export interface HealthConfig {
  withPostgres?: boolean;
  withRedis?: boolean;
  withNeo4j?: boolean;
  redis?: RedisHealthOptions;
}
