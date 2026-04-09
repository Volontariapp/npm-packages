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
import { BRIDGE_NOT_INITIALIZED } from '@volontariapp/errors-nest';
import { Logger } from '@volontariapp/logger';
import { HEALTH_CONFIG, type HealthConfig, type SupportedDatabase } from './health-config.js';
import {
  Neo4jNestHealthProvider,
  NestDatabaseHealthOrchestrator,
  PostgresNestHealthProvider,
  RedisNestHealthProvider,
} from './db-health.providers.js';

@Controller('health')
export class HealthController {
  private readonly logger = new Logger({ context: 'HealthController', format: 'json' });

  constructor(
    @Inject(HEALTH_CONFIG)
    private readonly config: HealthConfig,
    private health: HealthCheckService,
    @Optional() private readonly postgresProvider?: NestPostgresProvider,
    @Optional() private readonly redisProvider?: NestRedisProvider,
    @Optional() private readonly neo4jProvider?: NestNeo4jProvider,
  ) {}

  private getRequestedDatabases(): SupportedDatabase[] {
    return this.config.databases;
  }

  private shouldFailOnMissingProvider(): boolean {
    return this.config.failOnMissingProvider;
  }

  private buildOrchestrator(): NestDatabaseHealthOrchestrator {
    const dbHealthProviders: AbstractDatabaseHealthProvider[] = [];
    const requestedDatabases = this.getRequestedDatabases();
    const failOnMissingProvider = this.shouldFailOnMissingProvider();

    this.logger.debug('Building health-check orchestrator', {
      requestedDatabases,
      failOnMissingProvider,
    });

    for (const dbName of requestedDatabases) {
      if (dbName === 'postgres') {
        if (this.postgresProvider === undefined) {
          this.logger.warn('Postgres provider missing for health-check');
          if (failOnMissingProvider) {
            throw BRIDGE_NOT_INITIALIZED(
              'NestPostgresProvider for health-check. Import PostgresBridgeModule.register(...) first.',
            );
          }
          continue;
        }
        const postgresProvider = new PostgresNestHealthProvider(this.postgresProvider);
        dbHealthProviders.push(postgresProvider);
        this.logger.debug('Postgres health provider registered');
        continue;
      }

      if (dbName === 'redis') {
        if (this.redisProvider === undefined) {
          this.logger.warn('Redis provider missing for health-check');
          if (failOnMissingProvider) {
            throw BRIDGE_NOT_INITIALIZED(
              'NestRedisProvider for health-check. Import RedisBridgeModule.register(...) first.',
            );
          }
          continue;
        }

        dbHealthProviders.push(new RedisNestHealthProvider(this.redisProvider));
        this.logger.debug('Redis health provider registered');
        continue;
      }

      if (this.neo4jProvider === undefined) {
        this.logger.warn('Neo4j provider missing for health-check');
        if (failOnMissingProvider) {
          throw BRIDGE_NOT_INITIALIZED(
            'NestNeo4jProvider for health-check. Import Neo4jBridgeModule.register(...) first.',
          );
        }
        continue;
      }

      dbHealthProviders.push(new Neo4jNestHealthProvider(this.neo4jProvider));
      this.logger.debug('Neo4j health provider registered');
    }

    if (dbHealthProviders.length === 0) {
      this.logger.error('No database providers configured for health-check');
      throw BRIDGE_NOT_INITIALIZED('Database providers for health-check');
    }

    this.logger.info('Health-check orchestrator ready', { providersCount: dbHealthProviders.length });

    return new NestDatabaseHealthOrchestrator(new DatabaseHealthOrchestrator(dbHealthProviders));
  }

  @Get()
  @HealthCheck()
  check(): Promise<unknown> {
    this.logger.info('Health endpoint called');

    return this.health.check([
      async () => {
        const orchestrator = this.buildOrchestrator();
        const checks = await orchestrator.run();
        this.logger.info('Health checks completed', { checksCount: checks.length });
        return checks.reduce<Record<string, DatabaseHealthResult>>((acc, check) => {
          Object.assign(acc, check);
          return acc;
        }, {});
      },
    ]);
  }
}
