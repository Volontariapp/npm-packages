import { Module, Global } from '@nestjs/common';
import type { Provider, DynamicModule } from '@nestjs/common';
import type { IPostgresConfig } from '@volontariapp/bridge';
import { NestPostgresProvider } from '../../providers/postgres.provider.js';

@Global()
@Module({})
export class PostgresBridgeModule {
  static register(options: IPostgresConfig): DynamicModule {
    const provider: Provider = {
      provide: NestPostgresProvider,
      useValue: new NestPostgresProvider(options),
    };

    return {
      module: PostgresBridgeModule,
      providers: [provider],
      exports: [provider],
    };
  }
}
