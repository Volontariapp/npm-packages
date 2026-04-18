import { Module } from '@nestjs/common';
import type { Provider, DynamicModule } from '@nestjs/common';
import type { IRedisConfig } from '@volontariapp/bridge';
import { NestRedisProvider } from '../../providers/redis.provider.js';

@Module({})
export class RedisBridgeModule {
  static register(options: IRedisConfig): DynamicModule {
    const provider: Provider = {
      provide: NestRedisProvider,
      useValue: new NestRedisProvider(options),
    };

    return {
      module: RedisBridgeModule,
      providers: [provider],
      exports: [provider],
      global: true,
    };
  }
}
