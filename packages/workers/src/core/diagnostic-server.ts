import { createServer } from 'node:http';
import type { Server } from 'node:http';
import type { INestApplicationContext } from '@nestjs/common';
import { PostgresProvider, RedisProvider } from '@volontariapp/bridge';
import {
  PostgresBridgeHealthProvider,
  RedisBridgeHealthProvider,
} from '@volontariapp/health-check';
import { Logger } from '@volontariapp/logger';

export class DiagnosticServer {
  private readonly logger = new Logger({ context: 'DiagnosticServer' });
  private server?: Server;

  constructor(
    private readonly app: INestApplicationContext,
    private readonly port: number,
  ) {}

  public start(): void {
    const dbProvider = this.app.get(PostgresProvider, { strict: false });
    const redisProvider = this.app.get(RedisProvider, { strict: false });

    const pgHealthProvider = new PostgresBridgeHealthProvider(dbProvider);
    const redisHealthProvider = new RedisBridgeHealthProvider(redisProvider);

    this.server = createServer((req, res) => {
      void (async () => {
        if (req.url === '/health' || req.url === '/') {
          try {
            const [pgHealth, redisHealth] = await Promise.all([
              pgHealthProvider.health(),
              redisHealthProvider.health(),
            ]);

            const pgOk = pgHealth.status === 'up';
            const redisOk = redisHealth.status === 'up';

            if (!pgOk || !redisOk) {
              res.writeHead(503, { 'Content-Type': 'application/json' });
              res.end(
                JSON.stringify({
                  status: 'unhealthy',
                  postgres: pgHealth.status,
                  redis: redisHealth.status,
                }),
              );
              return;
            }

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(
              JSON.stringify({
                status: 'healthy',
                worker: 'awake',
                uptime: process.uptime(),
              }),
            );
          } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'error', message: errorMessage }));
          }
        } else {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ message: 'Not Found' }));
        }
      })();
    });

    this.server.listen(this.port, () => {
      this.logger.info(`Diagnostic Health Check server listening on port ${String(this.port)}`);
    });
  }

  public close(): void {
    if (this.server) {
      this.server.close();
      this.logger.info('Diagnostic Health Check server stopped.');
    }
  }
}
