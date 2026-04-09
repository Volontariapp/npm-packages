import { RedisBridgeHealthProvider } from '@volontariapp/health-check';
import { Logger } from '@volontariapp/logger';

export class RedisNestHealthProvider extends RedisBridgeHealthProvider {
  private readonly logger = new Logger({ context: 'RedisNestHealthProvider', format: 'json' });

  protected async pingDb(): Promise<void> {
    this.logger.debug('Starting Redis health check');

    try {
      await super.pingDb();
      this.logger.info('Redis health check succeeded');
    } catch (error: unknown) {
      this.logger.error('Redis health check failed', error);
      throw error;
    }
  }
}
