import { Module } from '@nestjs/common';
import type { Provider, DynamicModule } from '@nestjs/common';
import type { INeo4jConfig } from '@volontariapp/bridge';
import { NestNeo4jProvider } from '../../providers/neo4j.provider.js';
import { NEST_NEO4J_PROVIDER } from '../../index.js';

@Module({})
export class Neo4jBridgeModule {
  static register(config: INeo4jConfig): DynamicModule {
    const providerInstance = new NestNeo4jProvider(config);
    const provider: Provider = {
      provide: NestNeo4jProvider,
      useValue: providerInstance,
    };

    const stringProvider: Provider = {
      provide: NEST_NEO4J_PROVIDER,
      useValue: providerInstance,
    };

    return {
      module: Neo4jBridgeModule,
      providers: [provider, stringProvider],
      exports: [provider, stringProvider],
      global: true,
    };
  }
}
