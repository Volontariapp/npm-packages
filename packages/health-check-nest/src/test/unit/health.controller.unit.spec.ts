import { describe, expect, it } from '@jest/globals';
import type { NestPostgresProvider, NestRedisProvider } from '@volontariapp/bridge-nest';
import { HealthController } from '../../health-check/health.controller.js';
import type { HealthConfig } from '../../health-check/health-config.js';
import { createHealthServiceMock } from '../utils/utils.js';

describe('HealthController', () => {
  it('returns only configured database checks when providers are available', async () => {
    const config: HealthConfig = {
      databases: ['postgres', 'redis'],
    };

    const postgresProvider = {
      isConnected: () => true,
      getDriver: () => ({ query: () => Promise.resolve({}) }),
    } as unknown as NestPostgresProvider;

    const redisProvider = {
      isConnected: () => true,
      getDriver: () => ({ ping: () => Promise.resolve('PONG') }),
    } as unknown as NestRedisProvider;

    const controller = new HealthController(
      config,
      createHealthServiceMock(),
      postgresProvider,
      redisProvider,
      undefined,
    );

    const result = (await controller.check()) as Record<string, unknown>;

    expect(result).toHaveProperty('postgres');
    expect(result).toHaveProperty('redis');
    expect(result).not.toHaveProperty('neo4j');
  });

  it('throws when a requested provider is missing and failOnMissingProvider is true', async () => {
    const config: HealthConfig = {
      databases: ['neo4j'],
      failOnMissingProvider: true,
    };

    const controller = new HealthController(
      config,
      createHealthServiceMock(),
      undefined,
      undefined,
      undefined,
    );

    await expect(controller.check()).rejects.toMatchObject({
      code: 'BRIDGE_NOT_INITIALIZED',
    });
  });

  it('skips missing providers when failOnMissingProvider is false', async () => {
    const config: HealthConfig = {
      databases: ['postgres', 'neo4j'],
      failOnMissingProvider: false,
    };

    const postgresProvider = {
      isConnected: () => true,
      getDriver: () => ({ query: () => Promise.resolve({}) }),
    } as unknown as NestPostgresProvider;

    const controller = new HealthController(
      config,
      createHealthServiceMock(),
      postgresProvider,
      undefined,
      undefined,
    );

    const result = (await controller.check()) as Record<string, unknown>;

    expect(result).toHaveProperty('postgres');
    expect(result).not.toHaveProperty('neo4j');
  });

  it('throws when no providers are usable', async () => {
    const config: HealthConfig = {
      databases: ['redis'],
      failOnMissingProvider: false,
    };

    const controller = new HealthController(
      config,
      createHealthServiceMock(),
      undefined,
      undefined,
      undefined,
    );

    await expect(controller.check()).rejects.toMatchObject({
      code: 'BRIDGE_NOT_INITIALIZED',
    });
  });
});
