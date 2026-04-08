import { AbstractDatabaseHealthProvider } from './database-health.provider.js';
import type { Neo4jProvider, PostgresProvider, RedisProvider } from '@volontariapp/bridge';

export class PostgresBridgeHealthProvider extends AbstractDatabaseHealthProvider<PostgresProvider> {
  constructor(provider: PostgresProvider) {
    super('postgres', provider);
  }

  protected async pingDb(): Promise<void> {
    if (!this.client.isConnected()) {
      throw new Error('Postgres provider is not connected');
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
      throw new Error('Redis provider is not connected');
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
      throw new Error('Neo4j provider is not connected');
    }

    const driver = this.client.getDriver();
    await driver.verifyConnectivity();
  }
}
