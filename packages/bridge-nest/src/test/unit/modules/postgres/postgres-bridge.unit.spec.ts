import { jest } from '@jest/globals';
import { PostgresBridgeModule } from '../../../../modules/postgres/postgres-bridge.module.js';
import { NestPostgresProvider } from '../../../../providers/postgres.provider.js';

describe('PostgresBridgeModule (Unit)', () => {
  const config = {
    host: 'localhost',
    port: 5432,
    username: 'user',
    password: 'password',
    database: 'db',
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should register with correct providers and exports', () => {
    const dynamicModule = PostgresBridgeModule.register(config);

    expect(dynamicModule.module).toBe(PostgresBridgeModule);
    expect(dynamicModule.global).toBe(true);
    expect(dynamicModule.providers).toHaveLength(1);
    expect(dynamicModule.exports).toHaveLength(1);

    const provider = dynamicModule.providers?.[0] as { useValue: unknown };
    expect(provider.useValue).toBeInstanceOf(NestPostgresProvider);
  });
});
