import type { IPostgresConfig, INeo4jConfig, IRedisConfig } from '@volontariapp/bridge';

export const postgresConfig: IPostgresConfig = {
  host: 'localhost',
  port: 5432,
  username: 'user',
  password: 'password',
  database: 'bridge_test',
  synchronize: true,
};

export const neo4jConfig: INeo4jConfig = {
  url: 'bolt://localhost:7687',
  authToken: {
    principal: 'neo4j',
    credentials: 'password',
  },
};

export const redisConfig: IRedisConfig = {
  host: 'localhost',
  port: 6379,
};
