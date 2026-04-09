import { PostgresBridgeHealthProvider } from '@volontariapp/health-check';
import { Logger } from '@volontariapp/logger';

export class PostgresNestHealthProvider extends PostgresBridgeHealthProvider {
  private readonly logger = new Logger({ context: 'PostgresNestHealthProvider', format: 'json' });

  protected async pingDb(): Promise<void> {
    this.logger.debug('Starting Postgres health check');

    try {
      await super.pingDb();
      this.logger.info('Postgres health check succeeded');
    } catch (error: unknown) {
      this.logger.error('Postgres health check failed', error);
      throw error;
    }
  }
}
