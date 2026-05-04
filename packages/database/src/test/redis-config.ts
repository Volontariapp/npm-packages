import type { RedisOptions } from 'ioredis';
import { Redis } from 'ioredis';
import type { RedisConfig } from '@volontariapp/config';

export const testRedisOptions: RedisOptions = {
  host: '127.0.0.1',
  port: 6379,
  maxRetriesPerRequest: null,
  lazyConnect: true,
};

export const testRedisConfig: Partial<RedisConfig> = {
  host: '127.0.0.1',
  port: 6379,
  dbIndex: 0,
};

export const createTestRedisConnection = (): Redis => {
  return new Redis(testRedisOptions);
};

export const clearTestRedis = async (): Promise<void> => {
  const redis = createTestRedisConnection();
  try {
    await redis.connect();
    await redis.flushall();
  } finally {
    await redis.quit();
  }
};
