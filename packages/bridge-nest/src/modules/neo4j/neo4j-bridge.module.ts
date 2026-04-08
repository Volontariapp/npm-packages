import { Module, Global } from '@nestjs/common';
import type { Provider, DynamicModule } from '@nestjs/common';
import type { INeo4jConfig } from '@volontariapp/bridge';
import { NestNeo4jProvider } from '../../providers/neo4j.provider.js';

@Global()
@Module({})
export class Neo4jBridgeModule {
  static register(config: INeo4jConfig): DynamicModule {
    const provider: Provider = {
      provide: NestNeo4jProvider,
      useValue: new NestNeo4jProvider(config),
    };

    return {
      module: Neo4jBridgeModule,
      providers: [provider],
      exports: [provider],
    };
  }
}
