import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import {
  PostgresBridgeModule,
  Neo4jBridgeModule,
  RedisBridgeModule,
  NestPostgresProvider,
  NestNeo4jProvider,
  NestRedisProvider,
} from '../../index.js';
import { bridgeConfigExample } from '../example/config.example.js';

describe('Database Bridge Modules (Integration)', () => {
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        PostgresBridgeModule.register(bridgeConfigExample.postgres),
        Neo4jBridgeModule.register(bridgeConfigExample.neo4j),
        RedisBridgeModule.register(bridgeConfigExample.redis),
      ],
    }).compile();

    await module.init();
  });

  afterAll(async () => {
    await module.close();
  });

  it('should inject NestPostgresProvider and have it connected', () => {
    const provider = module.get(NestPostgresProvider);
    expect(provider).toBeDefined();
    expect(provider.isConnected()).toBe(true);
  });

  it('should inject NestNeo4jProvider and have it connected', () => {
    const provider = module.get(NestNeo4jProvider);
    expect(provider).toBeDefined();
    expect(provider.isConnected()).toBe(true);
  });

  it('should inject NestRedisProvider and have it connected', () => {
    const provider = module.get(NestRedisProvider);
    expect(provider).toBeDefined();
    expect(provider.isConnected()).toBe(true);
  });
});
