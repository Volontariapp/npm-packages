import { Redis } from 'ioredis';
import { testRedisOptions } from '../../../redis-config.js';

export async function clearTestRedis(): Promise<void> {
  const redis = new Redis(testRedisOptions);
  try {
    await redis.flushdb();
  } finally {
    await redis.quit();
  }
}
