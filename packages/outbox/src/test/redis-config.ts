import type { RedisOptions } from 'ioredis';
import { Redis } from 'ioredis';
import type { RedisConfig } from '@volontariapp/config';

export const testRedisOptions: RedisOptions = {
  host: 'localhost',
  port: 6378,
  maxRetriesPerRequest: null, // Required by BullMQ
  lazyConnect: true,
};

export const testRedisConfig = {
  host: 'localhost',
  port: 6378,
  dbIndex: 0,
} as unknown as RedisConfig;

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
