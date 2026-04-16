import { Client } from 'pg';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export default async () => {
  const config = {
    host: process.env.TEST_DB_HOST ?? 'localhost',
    port: Number(process.env.TEST_DB_PORT ?? 5433),
    user: process.env.TEST_DB_USER ?? 'testuser',
    password: process.env.TEST_DB_PASSWORD ?? 'testpassword',
    database: process.env.TEST_DB_NAME ?? 'volontariapp_test',
  };

  const maxAttempts = 20;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const client = new Client(config);

    try {
      await client.connect();
      await client.query('SELECT 1');
      await client.end();
      return;
    } catch {
      await client.end().catch(() => undefined);
      if (attempt === maxAttempts) {
        throw new Error('Test database is not reachable. Start it before running tests.');
      }
      await sleep(500);
    }
  }
};
