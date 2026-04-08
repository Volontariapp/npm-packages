import type { IBridgeConfig } from '../../interfaces/bridge-config.interface.js';

export const bridgeConfigExample: IBridgeConfig = {
  postgres: {
    host: 'localhost',
    port: 5432,
    username: 'user',
    password: 'password',
    database: 'bridge_test',
    synchronize: true,
  },
  neo4j: {
    url: 'bolt://localhost:7687',
    authToken: {
      principal: 'neo4j',
      credentials: 'password',
    },
  },
  redis: {
    host: 'localhost',
    port: 6379,
  },
};
