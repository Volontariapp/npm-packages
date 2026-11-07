import { jest } from '@jest/globals';
import type { NestNeo4jProvider } from '@volontariapp/bridge-nest';
import type { Driver, Session } from 'neo4j-driver';

export interface Neo4jProviderMock {
  provider: NestNeo4jProvider;
  /** Appels a run (session.run ou tx.run d'executeWrite): [cypher, params] dans l'ordre. */
  run: jest.Mock<(cypher: string, params: Record<string, unknown>) => Promise<unknown>>;
}

/** Provider Neo4j dont chaque session.run renvoie `records` (aucune connexion reelle). */
export const createNeo4jProviderMock = (records: unknown[] = []): Neo4jProviderMock => {
  const run = jest
    .fn<(cypher: string, params: Record<string, unknown>) => Promise<unknown>>()
    .mockResolvedValue({ records });
  const session = {
    run,
    // executeWrite execute le travail une fois sur une transaction qui delegue au meme `run`
    executeWrite: jest.fn((work: (tx: { run: typeof run }) => Promise<unknown>) => work({ run })),
    close: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
  } as unknown as Session;
  const driver = { session: jest.fn().mockReturnValue(session) } as unknown as Driver;
  const provider = {
    getDriver: jest.fn().mockReturnValue(driver),
  } as unknown as NestNeo4jProvider;
  return { provider, run };
};
