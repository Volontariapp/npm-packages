export type DatabaseHealthStatus = 'up' | 'down';

export interface DatabaseHealthError {
  name: string;
  message: string;
}

export interface DatabaseHealthResult {
  name: string;
  status: DatabaseHealthStatus;
  message: string;
  error?: DatabaseHealthError;
}

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
      return {
        name: error.name,
        message: error.message,
      };
    }

    if (typeof error === 'string') {
      return {
        name: 'Error',
        message: error,
      };
    }

    return {
      name: 'UnknownError',
      message: 'Unknown error while pinging database',
    };
  }
}
