import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { PostgresProvider } from '../../providers/postgres.provider.js';
import { Neo4jProvider } from '../../providers/neo4j.provider.js';
import { RedisProvider } from '../../providers/redis.provider.js';
import { postgresConfig, neo4jConfig, redisConfig } from './config.example.js';

describe('Bridge Providers (Integration)', () => {
  describe('PostgresProvider', () => {
    let provider: PostgresProvider;

    beforeAll(async () => {
      provider = new PostgresProvider(postgresConfig);
      await provider.connect();
    });

    afterAll(async () => {
      if (provider.isConnected()) {
        await provider.disconnect();
      }
    });

    it('should connect to Postgres', () => {
      expect(provider.isConnected()).toBe(true);
    });

    it('should be able to execute a query (PostGIS check)', async () => {
      const driver = provider.getDriver();
      const result = (await driver.query('SELECT postgis_version();')) as unknown as Array<{
        postgis_version: string;
      }>;
      expect(result).toBeDefined();
      expect(result[0]?.postgis_version).toBeDefined();
    });
  });

  describe('Neo4jProvider', () => {
    let provider: Neo4jProvider;

    beforeAll(async () => {
      provider = new Neo4jProvider(neo4jConfig);
      await provider.connect();
    });

    afterAll(async () => {
      if (provider.isConnected()) {
        await provider.disconnect();
      }
    });

    it('should connect to Neo4j', () => {
      expect(provider.isConnected()).toBe(true);
    });

    it('should be able to run a cypher query', async () => {
      const driver = provider.getDriver();
      const session = driver.session();
      const result = await session.run('RETURN 1 as val');
      const val = result.records[0]?.get('val') as { toNumber: () => number };
      expect(val.toNumber()).toBe(1);
      await session.close();
    });
  });

  describe('RedisProvider', () => {
    let provider: RedisProvider;

    beforeAll(async () => {
      provider = new RedisProvider(redisConfig);
      await provider.connect();
    });

    afterAll(async () => {
      if (provider.isConnected()) {
        await provider.disconnect();
      }
    });

    it('should connect to Redis', () => {
      expect(provider.isConnected()).toBe(true);
    });

    it('should be able to set and get a value', async () => {
      const redis = provider.getDriver();
      await redis.set('test_key', 'test_value');
      const val = await redis.get('test_key');
      expect(val).toBe('test_value');
    });
  });
});
