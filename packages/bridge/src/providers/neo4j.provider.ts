import type { Driver } from 'neo4j-driver';
import neo4j from 'neo4j-driver';
import { InternalServerError } from '@volontariapp/errors';
import { Logger } from '@volontariapp/logger';
import type { IConnectionProvider } from '../interfaces/provider.interface.js';
import type { INeo4jConfig } from '@volontariapp/config';

export class Neo4jProvider implements IConnectionProvider<Driver> {
  private driver: Driver | null = null;
  private connected = false;
  protected readonly logger = new Logger({ context: 'Neo4jProvider', format: 'json' });

  constructor(private readonly setup: INeo4jConfig) {}

  async connect(): Promise<void> {
    try {
      if (this.connected) return;

      this.driver = neo4j.driver(
        this.setup.url,
        neo4j.auth.basic(this.setup.authToken.principal, this.setup.authToken.credentials),
        this.setup.config,
      );

      await this.driver.verifyConnectivity();
      this.connected = true;
      this.logger.info('Connected to Neo4j');
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Unknown connection error';
      throw new InternalServerError(
        `Failed to connect to Neo4j: ${message}`,
        'NEO4J_CONNECTION_ERROR',
        { cause: e },
      );
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (!this.connected || !this.driver) return;
      await this.driver.close();
      this.connected = false;
      this.driver = null;
      this.logger.info('Disconnected from Neo4j');
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Unknown disconnection error';
      throw new InternalServerError(
        `Failed to disconnect from Neo4j: ${message}`,
        'NEO4J_DISCONNECTION_ERROR',
        { cause: e },
      );
    }
  }

  getDriver(): Driver {
    if (!this.connected || !this.driver) {
      throw new InternalServerError(
        'Neo4j driver not initialized. Call connect() first.',
        'NEO4J_NOT_INITIALIZED',
      );
    }
    return this.driver;
  }

  isConnected(): boolean {
    return this.connected;
  }
}
