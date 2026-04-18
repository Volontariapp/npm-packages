import 'reflect-metadata';

export * from './modules/postgres/postgres-bridge.module.js';
export * from './modules/neo4j/neo4j-bridge.module.js';
export * from './modules/redis/redis-bridge.module.js';

export * from './providers/postgres.provider.js';
export * from './providers/neo4j.provider.js';
export * from './providers/redis.provider.js';

export * from './interfaces/bridge-config.interface.js';

export const NEST_POSTGRES_PROVIDER = 'NEST_POSTGRES_PROVIDER';
export const NEST_NEO4J_PROVIDER = 'NEST_NEO4J_PROVIDER';
export const NEST_REDIS_PROVIDER = 'NEST_REDIS_PROVIDER';
