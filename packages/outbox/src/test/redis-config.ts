import type { RedisOptions } from 'ioredis';
import { Redis } from 'ioredis';
import type { RedisConfig } from '@volontariapp/config';

export const testRedisOptions: RedisOptions = {
  host: '127.0.0.1',
  port: 6379,
  username: 'user',
  password: 'password',
  maxRetriesPerRequest: null, // Required by BullMQ
  lazyConnect: true,
};

export const testRedisConfig: RedisConfig = {
  host: '127.0.0.1',
  port: 6379,
  dbIndex: 0,
  username: 'user',
  password: 'password',
  database: 'redis',
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
