import type { IPostgresConfig, INeo4jConfig, IRedisConfig } from '@volontariapp/bridge';

export interface IBridgeConfig {
  postgres: IPostgresConfig;
  neo4j: INeo4jConfig;
  redis: IRedisConfig;
}
