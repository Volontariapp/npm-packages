import {
  AbstractDatabaseHealthProvider,
  type DatabaseHealthResult,
  type OrchestratedHealthResult,
} from '@volontariapp/core';
import { Transport, type RedisOptions } from '@nestjs/microservices';
import type { MicroserviceHealthIndicator, TypeOrmHealthIndicator } from '@nestjs/terminus';
import type { RedisHealthOptions } from './health-config.js';

const DEFAULT_REDIS_OPTIONS: RedisHealthOptions = {
  host: 'localhost',
  port: 6379,
};

type DatabaseHealthRunner = {
  run(): Promise<OrchestratedHealthResult>;
};

export class PostgresHealthProvider extends AbstractDatabaseHealthProvider<TypeOrmHealthIndicator> {
  constructor(typeOrmIndicator: TypeOrmHealthIndicator) {
    super('postgres', typeOrmIndicator);
  }

  protected async pingDb(): Promise<void> {
    await this.client.pingCheck(this.name);
  }
}

export class RedisHealthProvider extends AbstractDatabaseHealthProvider<MicroserviceHealthIndicator> {
  constructor(
    microserviceIndicator: MicroserviceHealthIndicator,
    private readonly redisOptions?: RedisHealthOptions,
  ) {
    super('redis', microserviceIndicator);
  }

  protected async pingDb(): Promise<void> {
    await this.client.pingCheck<RedisOptions>(this.name, {
      transport: Transport.REDIS,
      options: {
        ...DEFAULT_REDIS_OPTIONS,
        ...this.redisOptions,
      },
    });
  }
}

export class NestDatabaseHealthOrchestrator {
  constructor(private readonly orchestrator: DatabaseHealthRunner) {}

  async run(): Promise<Array<Record<string, DatabaseHealthResult>>> {
    const result: OrchestratedHealthResult = await this.orchestrator.run();
    return result.checks.map((check) => ({ [check.name]: check }));
  }
}
