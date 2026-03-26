import { Controller, Get } from '@nestjs/common';
import type {
  HealthCheckService,
  TypeOrmHealthIndicator,
  MicroserviceHealthIndicator,
} from '@nestjs/terminus';
import { HealthCheck } from '@nestjs/terminus';
import type { RedisOptions, TcpClientOptions } from '@nestjs/microservices';
import { Transport } from '@nestjs/microservices';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private microservice: MicroserviceHealthIndicator,
    private db: TypeOrmHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.db.pingCheck('database'),
      async () =>
        this.microservice.pingCheck<TcpClientOptions>('tcp', {
          transport: Transport.TCP,
          options: { host: 'localhost', port: 8889 },
        }),
      async () =>
        this.microservice.pingCheck<RedisOptions>('redis', {
          transport: Transport.REDIS,
          options: {
            host: 'localhost',
            port: 6379,
          },
        }),
    ]);
  }
}
