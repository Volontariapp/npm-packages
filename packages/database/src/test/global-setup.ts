import { PostgresProvider } from '@volontariapp/bridge';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export default async () => {
  const provider = new PostgresProvider({
    host: process.env.TEST_DB_HOST ?? 'localhost',
    port: Number(process.env.TEST_DB_PORT ?? 5433),
    username: process.env.TEST_DB_USER ?? 'testuser',
    password: process.env.TEST_DB_PASSWORD ?? 'testpassword',
    database: process.env.TEST_DB_NAME ?? 'volontariapp_test',
  });

  const maxAttempts = 20;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await provider.connect();
      const dataSource = provider.getDriver();
      await dataSource.query('SELECT 1');
      await provider.disconnect();
      return;
    } catch {
      await provider.disconnect().catch(() => undefined);
      if (attempt === maxAttempts) {
        throw new Error('Test database is not reachable. Start it before running tests.');
      }
      await sleep(500);
    }
  }
};
