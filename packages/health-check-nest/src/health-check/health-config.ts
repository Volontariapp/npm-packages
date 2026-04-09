export const HEALTH_CONFIG = Symbol('HEALTH_CONFIG');

export type SupportedDatabase = 'postgres' | 'redis' | 'neo4j';

export interface HealthConfig {
  databases: SupportedDatabase[];
  failOnMissingProvider: boolean;
}
