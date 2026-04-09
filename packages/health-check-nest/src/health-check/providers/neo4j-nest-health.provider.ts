import { Neo4jBridgeHealthProvider } from '@volontariapp/health-check';
import { Logger } from '@volontariapp/logger';

export class Neo4jNestHealthProvider extends Neo4jBridgeHealthProvider {
  private readonly logger = new Logger({ context: 'Neo4jNestHealthProvider', format: 'json' });

  protected async pingDb(): Promise<void> {
    this.logger.debug('Starting Neo4j health check');

    try {
      await super.pingDb();
      this.logger.info('Neo4j health check succeeded');
    } catch (error: unknown) {
      this.logger.error('Neo4j health check failed', error);
      throw error;
    }
  }
}
