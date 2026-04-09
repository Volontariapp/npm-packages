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

type HealthProviderResolver = {
  create: () => AbstractDatabaseHealthProvider | undefined;
  missingWarning: string;
  missingErrorMessage: string;
  registeredDebugMessage: string;
};

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

  private getHealthProviderResolvers(): Record<SupportedDatabase, HealthProviderResolver> {
    return {
      postgres: {
        create: () =>
          this.postgresProvider === undefined
            ? undefined
            : new PostgresNestHealthProvider(this.postgresProvider),
        missingWarning: 'Postgres provider missing for health-check',
        missingErrorMessage:
          'NestPostgresProvider for health-check. Import PostgresBridgeModule.register(...) first.',
        registeredDebugMessage: 'Postgres health provider registered',
      },
      redis: {
        create: () =>
          this.redisProvider === undefined
            ? undefined
            : new RedisNestHealthProvider(this.redisProvider),
        missingWarning: 'Redis provider missing for health-check',
        missingErrorMessage:
          'NestRedisProvider for health-check. Import RedisBridgeModule.register(...) first.',
        registeredDebugMessage: 'Redis health provider registered',
      },
      neo4j: {
        create: () =>
          this.neo4jProvider === undefined
            ? undefined
            : new Neo4jNestHealthProvider(this.neo4jProvider),
        missingWarning: 'Neo4j provider missing for health-check',
        missingErrorMessage:
          'NestNeo4jProvider for health-check. Import Neo4jBridgeModule.register(...) first.',
        registeredDebugMessage: 'Neo4j health provider registered',
      },
    };
  }

  private registerRequestedProvider(
    dbName: SupportedDatabase,
    resolvers: Record<SupportedDatabase, HealthProviderResolver>,
    failOnMissingProvider: boolean,
    dbHealthProviders: AbstractDatabaseHealthProvider[],
  ): void {
    const resolver = resolvers[dbName];
    const provider = resolver.create();

    if (provider === undefined) {
      this.logger.warn(resolver.missingWarning);
      if (failOnMissingProvider) {
        throw BRIDGE_NOT_INITIALIZED(resolver.missingErrorMessage);
      }
      return;
    }

    dbHealthProviders.push(provider);
    this.logger.debug(resolver.registeredDebugMessage);
  }

  private buildOrchestrator(): NestDatabaseHealthOrchestrator {
    const dbHealthProviders: AbstractDatabaseHealthProvider[] = [];
    const requestedDatabases = this.getRequestedDatabases();
    const failOnMissingProvider = this.shouldFailOnMissingProvider();
    const resolvers = this.getHealthProviderResolvers();

    this.logger.debug('Building health-check orchestrator', {
      requestedDatabases,
      failOnMissingProvider,
    });

    for (const dbName of requestedDatabases) {
      this.registerRequestedProvider(dbName, resolvers, failOnMissingProvider, dbHealthProviders);
    }

    if (dbHealthProviders.length === 0) {
      this.logger.error('No database providers configured for health-check');
      throw BRIDGE_NOT_INITIALIZED('Database providers for health-check');
    }

    this.logger.info('Health-check orchestrator ready', {
      providersCount: dbHealthProviders.length,
    });

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
