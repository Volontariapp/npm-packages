import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import http from 'node:http';
import type { INestApplicationContext } from '@nestjs/common';
import { PostgresProvider, RedisProvider } from '@volontariapp/bridge';
import {
  PostgresBridgeHealthProvider,
  RedisBridgeHealthProvider,
} from '@volontariapp/health-check';
import { createMock } from '@volontariapp/testing';
import { DiagnosticServer } from '../../core/diagnostic-server.js';

interface QueryHealthResponse {
  status: number;
  body: {
    status: string;
    postProcessor?: string;
    uptime?: number;
    postgres?: string;
    redis?: string;
    message?: string;
  };
}

describe('DiagnosticServer — Unit', () => {
  let appMock: INestApplicationContext;
  let dbProviderMock: PostgresProvider;
  let redisProviderMock: RedisProvider;
  let diagnosticServer: DiagnosticServer;
  const PORT = 4999;

  beforeAll(() => {
    dbProviderMock = createMock<PostgresProvider>();
    redisProviderMock = createMock<RedisProvider>();

    appMock = createMock<INestApplicationContext>();
    jest.spyOn(appMock, 'get').mockImplementation(<T>(token: unknown): T => {
      if (token === PostgresProvider) return dbProviderMock as T;
      if (token === RedisProvider) return redisProviderMock as T;
      throw new Error(`Token ${String(token)} not supported in mock`);
    });

    diagnosticServer = new DiagnosticServer(appMock, PORT);
    diagnosticServer.start();
  });

  afterAll(() => {
    diagnosticServer.close();
  });

  const queryHealth = (): Promise<QueryHealthResponse> => {
    return new Promise((resolve, reject) => {
      http
        .get(`http://localhost:${String(PORT)}/health`, (res) => {
          let data = '';
          res.on('data', (chunk: string) => {
            data += chunk;
          });
          res.on('end', () => {
            resolve({
              status: res.statusCode ?? 0,
              body: JSON.parse(data) as QueryHealthResponse['body'],
            });
          });
        })
        .on('error', reject);
    });
  };

  it('should return 200 OK when Postgres and Redis are healthy (up)', async () => {
    jest.spyOn(PostgresBridgeHealthProvider.prototype, 'health').mockResolvedValue({
      name: 'postgres',
      status: 'up',
      message: 'Postgres is healthy',
    });

    jest.spyOn(RedisBridgeHealthProvider.prototype, 'health').mockResolvedValue({
      name: 'redis',
      status: 'up',
      message: 'Redis is healthy',
    });

    const res = await queryHealth();
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      status: 'healthy',
      postProcessor: 'awake',
      uptime: expect.any(Number),
    });
  });

  it('should return 503 Service Unavailable when Postgres is down', async () => {
    jest.spyOn(PostgresBridgeHealthProvider.prototype, 'health').mockResolvedValue({
      name: 'postgres',
      status: 'down',
      message: 'Postgres is not connected',
    });

    jest.spyOn(RedisBridgeHealthProvider.prototype, 'health').mockResolvedValue({
      name: 'redis',
      status: 'up',
      message: 'Redis is healthy',
    });

    const res = await queryHealth();
    expect(res.status).toBe(503);
    expect(res.body).toEqual({
      status: 'unhealthy',
      postgres: 'down',
      redis: 'up',
    });
  });

  it('should return 503 Service Unavailable when Redis is down', async () => {
    jest.spyOn(PostgresBridgeHealthProvider.prototype, 'health').mockResolvedValue({
      name: 'postgres',
      status: 'up',
      message: 'Postgres is healthy',
    });

    jest.spyOn(RedisBridgeHealthProvider.prototype, 'health').mockResolvedValue({
      name: 'redis',
      status: 'down',
      message: 'Redis connection lost',
    });

    const res = await queryHealth();
    expect(res.status).toBe(503);
    expect(res.body).toEqual({
      status: 'unhealthy',
      postgres: 'up',
      redis: 'down',
    });
  });

  it('should return 500 Internal Server Error if the health check throws an exception', async () => {
    jest
      .spyOn(PostgresBridgeHealthProvider.prototype, 'health')
      .mockRejectedValue(new Error('Network access denied'));

    const res = await queryHealth();
    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      status: 'error',
      message: 'Network access denied',
    });
  });

  it('should return 404 Not Found for an unknown URL', async () => {
    const queryNotFound = (): Promise<QueryHealthResponse> => {
      return new Promise((resolve, reject) => {
        http
          .get(`http://localhost:${String(PORT)}/unknown`, (res) => {
            let data = '';
            res.on('data', (chunk: string) => {
              data += chunk;
            });
            res.on('end', () => {
              resolve({
                status: res.statusCode ?? 0,
                body: JSON.parse(data) as QueryHealthResponse['body'],
              });
            });
          })
          .on('error', reject);
      });
    };

    const res = await queryNotFound();
    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      message: 'Not Found',
    });
  });

  it('should return 500 Internal Server Error if the health check throws an exception that is not an instance of Error', async () => {
    jest
      .spyOn(PostgresBridgeHealthProvider.prototype, 'health')
      .mockRejectedValue('Unexpected string error');

    const res = await queryHealth();
    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      status: 'error',
      message: 'Unexpected string error',
    });
  });
});
