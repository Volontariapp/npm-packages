import { beforeAll, afterAll, describe, expect, it } from '@jest/globals';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { HealthCheckService } from '@nestjs/terminus';
import type { IPostgresConfig, INeo4jConfig, IRedisConfig } from '@volontariapp/bridge';
import {
  NestNeo4jProvider,
  NestPostgresProvider,
  NestRedisProvider,
  Neo4jBridgeModule,
  PostgresBridgeModule,
  RedisBridgeModule,
} from '@volontariapp/bridge-nest';
import { HEALTH_CONFIG } from '../../health-check/health-config.js';
import { HealthController } from '../../health-check/health.controller.js';
import { createHealthServiceMock } from '../utils/utils.js';

type HealthResponse = {
  status?: string;
  details?: Record<string, { status?: string }>;
  info?: Record<string, { status?: string }>;
  postgres?: { status?: string };
  neo4j?: { status?: string };
  redis?: { status?: string };
};

const testDbPostgresConfig: IPostgresConfig = {
  host: 'localhost',
  port: 5432,
  username: 'user',
  password: 'password',
  database: 'bridge_test',
  synchronize: true,
};

const testDbNeo4jConfig: INeo4jConfig = {
  url: 'bolt://localhost:7687',
  authToken: {
    principal: 'neo4j',
    credentials: 'password',
  },
};

const testDbRedisConfig: IRedisConfig = {
  host: 'localhost',
  port: 6379,
};

describe('Health Check Nest (Integration)', () => {
  let moduleRef: TestingModule;
  let controller: HealthController;
  let postgresProvider: NestPostgresProvider;
  let neo4jProvider: NestNeo4jProvider;
  let redisProvider: NestRedisProvider;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        PostgresBridgeModule.register(testDbPostgresConfig),
        Neo4jBridgeModule.register(testDbNeo4jConfig),
        RedisBridgeModule.register(testDbRedisConfig),
      ],
      providers: [
        HealthController,
        {
          provide: HEALTH_CONFIG,
          useValue: {
            databases: ['postgres', 'neo4j', 'redis'],
            failOnMissingProvider: true,
          },
        },
        {
          provide: HealthCheckService,
          useValue: createHealthServiceMock(),
        },
      ],
    }).compile();

    await moduleRef.init();
    controller = moduleRef.get(HealthController);
    postgresProvider = moduleRef.get(NestPostgresProvider);
    neo4jProvider = moduleRef.get(NestNeo4jProvider);
    redisProvider = moduleRef.get(NestRedisProvider);
  });

  afterAll(async () => {
    if (moduleRef !== undefined) {
      await moduleRef.close();
    }
  });

  it('should inject NestPostgresProvider and have it connected', () => {
    expect(postgresProvider).toBeDefined();
    expect(postgresProvider.isConnected()).toBe(true);
  });

  it('should inject NestNeo4jProvider and have it connected', () => {
    expect(neo4jProvider).toBeDefined();
    expect(neo4jProvider.isConnected()).toBe(true);
  });

  it('should inject NestRedisProvider and have it connected', () => {
    expect(redisProvider).toBeDefined();
    expect(redisProvider.isConnected()).toBe(true);
  });

  it('should be able to execute a query on test-db', async () => {
    const driver = postgresProvider.getDriver();
    const rawResult: unknown = await driver.query('SELECT 1 as value;');
    expect(rawResult).toBeDefined();
    expect(Array.isArray(rawResult)).toBe(true);

    const rows = rawResult as Array<{ value: number | string }>;
    expect(Number(rows[0]?.value)).toBe(1);
  });

  it('should be able to execute a cypher query on neo4j', async () => {
    const driver = neo4jProvider.getDriver();
    const session = driver.session();

    const rawResult = await session.run('RETURN 1 as value;');
    const rawValue = rawResult.records[0]?.get('value') as unknown;
    const value = Number(String(rawValue));

    expect(value).toBe(1);
    await session.close();
  });

  it('should be able to set/get a key on redis', async () => {
    const redis = redisProvider.getDriver();
    const testKey = 'health-check-nest:int:test_key';

    await redis.set(testKey, 'test_value');
    const value = await redis.get(testKey);

    expect(value).toBe('test_value');
  });

  it('should report postgres, neo4j and redis as healthy', async () => {
    const result = (await controller.check()) as HealthResponse;
    if (result.status !== undefined) {
      expect(result.status).toBe('ok');
    }

    const checks = result.details ?? result.info ?? result;
    expect(checks.postgres?.status).toBe('up');
    expect(checks.neo4j?.status).toBe('up');
    expect(checks.redis?.status).toBe('up');
  });
});
