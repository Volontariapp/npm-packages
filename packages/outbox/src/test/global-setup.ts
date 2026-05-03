import { PostgresProvider } from '@volontariapp/bridge';
import { Redis } from 'ioredis';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export default async () => {
  const provider = new PostgresProvider({
    host: 'localhost',
    port: 5433,
    username: 'testuser',
    password: 'testpassword',
    database: 'volontariapp_test',
  });

  const redis = new Redis({
    host: 'localhost',
    port: 6379,
    lazyConnect: true,
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
      await redis.connect();
      await redis.ping();
      await redis.quit();

      return;
    } catch {
      await provider.disconnect().catch(() => undefined);
      await redis.quit().catch(() => undefined);
      if (attempt === maxAttempts) {
        throw new Error(
          'Test database or Redis is not reachable. Start them before running tests.',
        );
      }
      await sleep(500);
    }
  }
};
