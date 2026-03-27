export const HEALTH_CONFIG = Symbol('HEALTH_CONFIG');

export interface RedisHealthOptions {
  host: string;
  port: number;
}

export interface HealthConfig {
  dbType: 'postgres' | 'neo4j';
  withRedis?: boolean;
  redis?: RedisHealthOptions;
}
