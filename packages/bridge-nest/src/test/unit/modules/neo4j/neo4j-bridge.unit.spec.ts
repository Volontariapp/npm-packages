import { jest } from '@jest/globals';
import { Neo4jBridgeModule } from '../../../../modules/neo4j/neo4j-bridge.module.js';
import { NestNeo4jProvider } from '../../../../providers/neo4j.provider.js';
import { NEST_NEO4J_PROVIDER } from '../../../../index.js';

describe('Neo4jBridgeModule (Unit)', () => {
  const config = {
    url: 'bolt://localhost:7687',
    authToken: { principal: 'neo4j', credentials: 'password' },
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should register with correct providers and exports', () => {
    const dynamicModule = Neo4jBridgeModule.register(config);

    expect(dynamicModule.module).toBe(Neo4jBridgeModule);
    expect(dynamicModule.global).toBe(true);
    expect(dynamicModule.providers).toHaveLength(2);
    expect(dynamicModule.exports).toHaveLength(2);

    const providerClass = dynamicModule.providers?.find(
      (p: unknown) => (p as { provide: unknown }).provide === NestNeo4jProvider,
    ) as { useValue: unknown };
    const providerString = dynamicModule.providers?.find(
      (p: unknown) => (p as { provide: unknown }).provide === NEST_NEO4J_PROVIDER,
    ) as { useValue: unknown };

    expect(providerClass.useValue).toBeInstanceOf(NestNeo4jProvider);
    expect(providerString.useValue).toBe(providerClass.useValue);
  });
});
