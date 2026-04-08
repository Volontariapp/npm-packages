import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { Neo4jProvider, PostgresProvider, RedisProvider } from '@volontariapp/bridge';
import {
  DatabaseHealthOrchestrator,
  Neo4jBridgeHealthProvider,
  PostgresBridgeHealthProvider,
  RedisBridgeHealthProvider,
} from '../../index.js';
import { neo4jConfig, postgresConfig, redisConfig } from './config.example.js';

describe('Database health (Integration)', () => {
  let postgresProvider: PostgresProvider;
  let neo4jProvider: Neo4jProvider;
  let redisProvider: RedisProvider;

  beforeAll(async () => {
    postgresProvider = new PostgresProvider(postgresConfig);
    neo4jProvider = new Neo4jProvider(neo4jConfig);
    redisProvider = new RedisProvider(redisConfig);

    await postgresProvider.connect();
    await neo4jProvider.connect();
    await redisProvider.connect();
  });

  afterAll(async () => {
    if (postgresProvider.isConnected()) {
      await postgresProvider.disconnect();
    }

    if (neo4jProvider.isConnected()) {
      await neo4jProvider.disconnect();
    }

    if (redisProvider.isConnected()) {
      await redisProvider.disconnect();
    }
  });

  it('should report postgres, neo4j and redis as healthy', async () => {
    const orchestrator = new DatabaseHealthOrchestrator([
      new PostgresBridgeHealthProvider(postgresProvider),
      new Neo4jBridgeHealthProvider(neo4jProvider),
      new RedisBridgeHealthProvider(redisProvider),
    ]);

    const result = await orchestrator.run();

    expect(result.status).toBe('ok');
    expect(result.checks).toHaveLength(3);
    expect(result.checks.find((check) => check.name === 'postgres')?.status).toBe('up');
    expect(result.checks.find((check) => check.name === 'neo4j')?.status).toBe('up');
    expect(result.checks.find((check) => check.name === 'redis')?.status).toBe('up');
  });
});
