import { DatabaseHealthError } from '@volontariapp/errors';
import type { DatabaseHealthResult } from './database-health-types.js';

export abstract class AbstractDatabaseHealthProvider<TClient = unknown> {
  protected constructor(
    public readonly name: string,
    protected readonly client: TClient,
  ) {}

  protected abstract pingDb(): Promise<void>;

  async health(): Promise<DatabaseHealthResult> {
    try {
      await this.pingDb();
      return {
        name: this.name,
        status: 'up',
        message: `${this.name} connection is healthy`,
      };
    } catch (error: unknown) {
      const normalizedError = this.normalizeError(error);
      return {
        name: this.name,
        status: 'down',
        message: `${this.name} connection failed`,
        error: normalizedError,
      };
    }
  }

  private normalizeError(error: unknown): DatabaseHealthError {
    if (error instanceof Error) {
      return new DatabaseHealthError(error.message, 'DATABASE_HEALTH_ERROR', {
        causeName: error.name,
      });
    }

    if (typeof error === 'string') {
      return new DatabaseHealthError(error);
    }

    return new DatabaseHealthError('Unknown error while pinging database');
  }
}
