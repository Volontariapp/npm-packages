import { DynamicModule, Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HttpModule } from '@nestjs/axios';
import { HealthController } from './health.controller.js';
import { HEALTH_CONFIG, HealthConfig } from './health-config.js';

@Module({
  imports: [TerminusModule.forRoot({
    // place future logger here
  }), HttpModule],
})
export class HealthModule {
  static register(config: HealthConfig): DynamicModule{
    return {
      module: HealthModule,
      controllers: [HealthController],
      providers: [
        {
          provide: HEALTH_CONFIG,
          useValue: config,
        },
      ],
    }
  }
}
