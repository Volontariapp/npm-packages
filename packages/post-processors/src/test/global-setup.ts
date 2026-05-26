import { Redis } from 'ioredis';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export default async () => {
  const maxAttempts = 20;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      // Check Redis
      const redis = new Redis({
        host: '127.0.0.1',
        port: 6379,
        password: 'password',
        connectTimeout: 1000,
        retryStrategy: () => null,
      });
      redis.on('error', () => {});

      try {
        await redis.ping();
        await redis.quit();
      } catch (err) {
        await redis.quit().catch(() => undefined);
        throw err;
      }

      return;
    } catch (err: unknown) {
      console.log(err);
      if (attempt === maxAttempts) {
        throw new Error('Test Redis is not reachable. Start it before running tests.');
      }
      await sleep(500);
    }
  }
};
