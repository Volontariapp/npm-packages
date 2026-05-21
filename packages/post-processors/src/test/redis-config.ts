import type { RedisOptions } from 'ioredis';

export const testRedisOptions: RedisOptions = {
  host: '127.0.0.1',
  port: 6379,
  db: 0,
  password: 'password',
  retryStrategy: () => null,
};
