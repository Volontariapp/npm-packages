import { Controller, Get, Inject, Optional } from '@nestjs/common';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import {
  NestNeo4jProvider,
  NestPostgresProvider,
  NestRedisProvider,
} from '@volontariapp/bridge-nest';
import {
  DatabaseHealthOrchestrator,
  type AbstractDatabaseHealthProvider,
  type DatabaseHealthResult,
} from '@volontariapp/health-check';
import { HEALTH_CONFIG, type HealthConfig, type SupportedDatabase } from './health-config.js';
import {
  Neo4jNestHealthProvider,
  NestDatabaseHealthOrchestrator,
  PostgresNestHealthProvider,
  RedisNestHealthProvider,
} from './db-health.providers.js';

@Controller('health')
export class HealthController {
  constructor(
    @Inject(HEALTH_CONFIG)
    private readonly config: HealthConfig,
    private health: HealthCheckService,
    @Optional() private readonly postgresProvider?: NestPostgresProvider,
    @Optional() private readonly redisProvider?: NestRedisProvider,
    @Optional() private readonly neo4jProvider?: NestNeo4jProvider,
  ) {}

  private getRequestedDatabases(): SupportedDatabase[] {
    return this.config.databases ?? ['postgres', 'redis', 'neo4j'];
  }

  private shouldFailOnMissingProvider(): boolean {
    return this.config.failOnMissingProvider ?? true;
  }

  private buildOrchestrator(): NestDatabaseHealthOrchestrator {
    const dbHealthProviders: AbstractDatabaseHealthProvider[] = [];
    const requestedDatabases = this.getRequestedDatabases();
    const failOnMissingProvider = this.shouldFailOnMissingProvider();

    for (const dbName of requestedDatabases) {
      if (dbName === 'postgres') {
        if (this.postgresProvider === undefined) {
          if (failOnMissingProvider) {
            throw new Error('Missing NestPostgresProvider. Import PostgresBridgeModule.register(...) first.');
          }
          continue;
        }
        const postgresProvider = new PostgresNestHealthProvider(this.postgresProvider);
        dbHealthProviders.push(postgresProvider);
        continue;
      }

      if (dbName === 'redis') {
        if (this.redisProvider === undefined) {
          if (failOnMissingProvider) {
            throw new Error('Missing NestRedisProvider. Import RedisBridgeModule.register(...) first.');
          }
          continue;
        }

        dbHealthProviders.push(new RedisNestHealthProvider(this.redisProvider));
        continue;
      }

      if (this.neo4jProvider === undefined) {
        if (failOnMissingProvider) {
          throw new Error('Missing NestNeo4jProvider. Import Neo4jBridgeModule.register(...) first.');
        }
        continue;
      }

      dbHealthProviders.push(new Neo4jNestHealthProvider(this.neo4jProvider));
    }

    if (dbHealthProviders.length === 0) {
      throw new Error('No database providers configured for health-check.');
    }

    return new NestDatabaseHealthOrchestrator(new DatabaseHealthOrchestrator(dbHealthProviders));
  }

  @Get()
  @HealthCheck()
  check(): Promise<unknown> {
    return this.health.check([
      async () => {
        const orchestrator = this.buildOrchestrator();
        const checks = await orchestrator.run();
        return checks.reduce<Record<string, DatabaseHealthResult>>((acc, check) => {
          Object.assign(acc, check);
          return acc;
        }, {});
      },
    ]);
  }
}
