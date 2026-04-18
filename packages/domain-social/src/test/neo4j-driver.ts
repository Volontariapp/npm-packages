import neo4j, { type Driver } from 'neo4j-driver';
import type { NestNeo4jProvider } from '@volontariapp/bridge-nest';

let driver: Driver | null = null;

export const initTestNeo4j = async (): Promise<void> => {
  driver = neo4j.driver(
    process.env['NEO4J_URL'] ?? 'bolt://localhost:7687',
    neo4j.auth.basic(
      process.env['NEO4J_USER'] ?? 'neo4j',
      process.env['NEO4J_PASSWORD'] ?? 'password',
    ),
  );
  await driver.verifyConnectivity();
};

export const closeTestNeo4j = async (): Promise<void> => {
  await driver?.close();
  driver = null;
};

export const getTestProvider = (): NestNeo4jProvider => {
  if (!driver) throw new Error('Neo4j test driver not initialized. Call initTestNeo4j() first.');
  const d = driver;
  return { getDriver: () => d } as unknown as NestNeo4jProvider;
};

export const clearGraph = async (): Promise<void> => {
  if (!driver) return;
  const session = driver.session();
  try {
    await session.run(
      'MATCH (n) WHERE n:SocialUser OR n:SocialPost OR n:SocialEvent DETACH DELETE n',
    );
  } finally {
    await session.close();
  }
};
