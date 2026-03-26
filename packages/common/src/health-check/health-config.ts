export const HEALTH_CONFIG = Symbol('HEALTH_CONFIG');

export interface HealthConfig {
  withPostgres?: boolean;
  withRedis?: boolean;
  withNeo4j?: boolean;
}
