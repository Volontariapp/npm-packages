import {
  AbstractDatabaseHealthProvider,
  type DatabaseHealthResult,
  type OrchestratedHealthResult,
} from '@volontariapp/health-check';
import type {
  NestNeo4jProvider,
  NestPostgresProvider,
  NestRedisProvider,
} from '@volontariapp/bridge-nest';

type DatabaseHealthRunner = {
  run(): Promise<OrchestratedHealthResult>;
};

export class PostgresNestHealthProvider extends AbstractDatabaseHealthProvider<NestPostgresProvider> {
  constructor(provider: NestPostgresProvider) {
    super('postgres', provider);
  }

  protected async pingDb(): Promise<void> {
    if (!this.client.isConnected()) {
      throw new Error('Postgres provider is not connected');
    }

    await this.client.getDriver().query('SELECT 1');
  }
}

export class RedisNestHealthProvider extends AbstractDatabaseHealthProvider<NestRedisProvider> {
  constructor(provider: NestRedisProvider) {
    super('redis', provider);
  }

  protected async pingDb(): Promise<void> {
    if (!this.client.isConnected()) {
      throw new Error('Redis provider is not connected');
    }

    await this.client.getDriver().ping();
  }
}

export class Neo4jNestHealthProvider extends AbstractDatabaseHealthProvider<NestNeo4jProvider> {
  constructor(provider: NestNeo4jProvider) {
    super('neo4j', provider);
  }

  protected async pingDb(): Promise<void> {
    if (!this.client.isConnected()) {
      throw new Error('Neo4j provider is not connected');
    }

    await this.client.getDriver().verifyConnectivity();
  }
}

export class NestDatabaseHealthOrchestrator {
  constructor(private readonly orchestrator: DatabaseHealthRunner) {}

  async run(): Promise<Array<Record<string, DatabaseHealthResult>>> {
    const result: OrchestratedHealthResult = await this.orchestrator.run();
    return result.checks.map((check: DatabaseHealthResult) => ({ [check.name]: check }));
  }
}
