import { Controller, Get, Inject } from '@nestjs/common';
import type {
  HealthCheckService,
  TypeOrmHealthIndicator,
  MicroserviceHealthIndicator,
} from '@nestjs/terminus';
import { HealthCheck } from '@nestjs/terminus';
import {
  DatabaseHealthOrchestrator,
  type AbstractDatabaseHealthProvider,
  type DatabaseHealthResult,
} from '@volontariapp/health-check-providers';
import { HEALTH_CONFIG, type HealthConfig } from './health-config.js';
import {
  Neo4jHealthProvider,
  NestDatabaseHealthOrchestrator,
  PostgresHealthProvider,
  RedisHealthProvider,
} from './db-health.providers.js';

@Controller('health')
export class HealthController {
  constructor(
    @Inject(HEALTH_CONFIG)
    private readonly config: HealthConfig,
    private health: HealthCheckService,
    private microservice: MicroserviceHealthIndicator,
    private db: TypeOrmHealthIndicator,
  ) {}

  private buildOrchestrator(): NestDatabaseHealthOrchestrator {
    const providers: AbstractDatabaseHealthProvider[] = [];

    if (this.config.dbType === 'postgres') {
      providers.push(new PostgresHealthProvider(this.db));
    }
    else if (this.config.dbType === 'neo4j') {
      providers.push(new Neo4jHealthProvider(this.db));
    }

    if (this.config.withRedis ?? false) {
      providers.push(new RedisHealthProvider(this.microservice, this.config.redis));
    }

    return new NestDatabaseHealthOrchestrator(new DatabaseHealthOrchestrator(providers));
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
