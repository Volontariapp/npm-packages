import { jest } from '@jest/globals';
import { RedisBridgeModule } from '../../../../modules/redis/redis-bridge.module.js';
import { NestRedisProvider } from '../../../../providers/redis.provider.js';

describe('RedisBridgeModule (Unit)', () => {
  const config = {
    host: 'localhost',
    port: 6379,
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should register with correct providers and exports', () => {
    const dynamicModule = RedisBridgeModule.register(config);

    expect(dynamicModule.module).toBe(RedisBridgeModule);
    expect(dynamicModule.global).toBe(true);
    expect(dynamicModule.providers).toHaveLength(1);
    expect(dynamicModule.exports).toHaveLength(1);

    const provider = dynamicModule.providers?.[0] as { useValue: unknown };
    expect(provider.useValue).toBeInstanceOf(NestRedisProvider);
  });
});
