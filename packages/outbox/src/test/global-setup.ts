import { PostgresProvider } from '@volontariapp/bridge';
import { Redis } from 'ioredis';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export default async () => {
  const provider = new PostgresProvider({
    host: '127.0.0.1',
    port: 5433,
    username: 'testuser',
    password: 'testpassword',
    database: 'volontariapp_test',
  });

  const maxAttempts = 20;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      // Check Postgres
      await provider.connect();
      const dataSource = provider.getDriver();
      await dataSource.query('SELECT 1');
      await provider.disconnect();

      // Check Redis
      const redis = new Redis({
        host: '127.0.0.1',
        port: 6379,
        username: 'user',
        password: 'password',
        connectTimeout: 1000,
        retryStrategy: () => null,
      });
      redis.on('error', () => {}); // Prevent unhandled error events

      try {
        await redis.ping();
        await redis.quit();
      } catch (err) {
        await redis.quit().catch(() => undefined);
        throw err;
      }

      return;
    } catch {
      await provider.disconnect().catch(() => undefined);
      if (attempt === maxAttempts) {
        throw new Error(
          'Test database or Redis is not reachable. Start them before running tests.',
        );
      }
      await sleep(500);
    }
  }
};
