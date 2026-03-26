import { Controller, Get, Inject } from '@nestjs/common';
import type {
  HealthCheckService,
  TypeOrmHealthIndicator,
  MicroserviceHealthIndicator,
  HealthIndicatorFunction,
} from '@nestjs/terminus';
import { HealthCheck } from '@nestjs/terminus';
import type { RedisOptions } from '@nestjs/microservices';
import { Transport } from '@nestjs/microservices';
import {type HealthConfig} from './health-config.js';

@Controller('health')
export class HealthController {
  constructor(@Inject('HEALTH_CONFIG')
    private config: HealthConfig,
    private health: HealthCheckService,
    private microservice: MicroserviceHealthIndicator,
    private db: TypeOrmHealthIndicator,
    // private neo4jDb: null,
  ) {}

  /**
   * By default, the health check will check everything set to true, and default values are true
   * @returns health check indicators regarding the configuration
   */
  private buildChecks(): HealthIndicatorFunction[] {
    const checks: HealthIndicatorFunction[] = [];

    if (this.config.withPostgres ?? true) {
      checks.push(() => this.db.pingCheck('database'));
    }

    if (this.config.withRedis ?? false) {
      checks.push(async () =>
        this.microservice.pingCheck<RedisOptions>('redis', {
          transport: Transport.REDIS,
          options: {
            host: 'localhost',
            port: 6379,
          },
        }),
      );
    }
    return checks;
  }

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([...this.buildChecks()]);
  }
}
