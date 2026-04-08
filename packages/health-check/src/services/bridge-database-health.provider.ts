import { AbstractDatabaseHealthProvider } from './database-health.provider.js';
import type { Neo4jProvider, PostgresProvider, RedisProvider } from '@volontariapp/bridge';
import { InternalServerError } from '@volontariapp/errors';

export class PostgresBridgeHealthProvider extends AbstractDatabaseHealthProvider<PostgresProvider> {
  constructor(provider: PostgresProvider) {
    super('postgres', provider);
  }

  protected async pingDb(): Promise<void> {
    if (!this.client.isConnected()) {
      throw new InternalServerError(
        'Postgres provider is not connected',
        'HEALTH_CHECK_POSTGRES_NOT_CONNECTED',
      );
    }

    const driver = this.client.getDriver();
    await driver.query('SELECT 1');
  }
}

export class RedisBridgeHealthProvider extends AbstractDatabaseHealthProvider<RedisProvider> {
  constructor(provider: RedisProvider) {
    super('redis', provider);
  }

  protected async pingDb(): Promise<void> {
    if (!this.client.isConnected()) {
      throw new InternalServerError(
        'Redis provider is not connected',
        'HEALTH_CHECK_REDIS_NOT_CONNECTED',
      );
    }

    const driver = this.client.getDriver();
    await driver.ping();
  }
}

export class Neo4jBridgeHealthProvider extends AbstractDatabaseHealthProvider<Neo4jProvider> {
  constructor(provider: Neo4jProvider) {
    super('neo4j', provider);
  }

  protected async pingDb(): Promise<void> {
    if (!this.client.isConnected()) {
      throw new InternalServerError(
        'Neo4j provider is not connected',
        'HEALTH_CHECK_NEO4J_NOT_CONNECTED',
      );
    }

    const driver = this.client.getDriver();
    await driver.verifyConnectivity();
  }
}
