import { DataSource } from 'typeorm';
import type { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions.js';
import { InternalServerError } from '@volontariapp/errors';
import { Logger } from '@volontariapp/logger';
import type { IConnectionProvider } from '../interfaces/provider.interface.js';
import type { IPostgresConfig } from '../interfaces/database.config.interface.js';

export class PostgresProvider implements IConnectionProvider<DataSource> {
  private dataSource: DataSource;
  private connected = false;
  protected readonly logger = new Logger({ context: 'PostgresProvider', format: 'json' });

  constructor(options: IPostgresConfig) {
    this.dataSource = new DataSource({
      ...(options as PostgresConnectionOptions),
      type: 'postgres',
    });
  }

  async connect(): Promise<void> {
    try {
      if (this.connected) return;
      await this.dataSource.initialize();
      this.connected = true;
      this.logger.info('Connected to Postgres');
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Unknown connection error';
      throw new InternalServerError(
        `Failed to connect to Postgres: ${message}`,
        'POSTGRES_CONNECTION_ERROR',
        { cause: e },
      );
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (!this.connected) return;
      await this.dataSource.destroy();
      this.connected = false;
      this.logger.info('Disconnected from Postgres');
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Unknown disconnection error';
      throw new InternalServerError(
        `Failed to disconnect from Postgres: ${message}`,
        'POSTGRES_DISCONNECTION_ERROR',
        { cause: e },
      );
    }
  }

  getDriver(): DataSource {
    if (!this.connected) {
      throw new InternalServerError(
        'Postgres driver not initialized. Call connect() first.',
        'POSTGRES_NOT_INITIALIZED',
      );
    }
    return this.dataSource;
  }

  isConnected(): boolean {
    return this.connected;
  }
}
