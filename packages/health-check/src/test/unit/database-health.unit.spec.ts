import { describe, expect, it } from '@jest/globals';
import { DatabaseHealthError } from '@volontariapp/errors';
import {
  AbstractDatabaseHealthProvider,
  DatabaseHealthOrchestrator,
} from '../../index.js';

class TestProvider extends AbstractDatabaseHealthProvider {
  constructor(
    name: string,
    private readonly pingFn: () => Promise<void>,
  ) {
    super(name, {});
  }

  protected async pingDb(): Promise<void> {
    await this.pingFn();
  }
}

describe('Database health core', () => {
  it('returns up when ping succeeds', async () => {
    const provider = new TestProvider('postgres', async () => Promise.resolve());

    await expect(provider.health()).resolves.toEqual({
      name: 'postgres',
      status: 'up',
      message: 'postgres connection is healthy',
    });
  });

  it('normalizes error when ping fails', async () => {
    const provider = new TestProvider('redis', () => Promise.reject(new Error('boom')));

    const result = await provider.health();

    expect(result).toMatchObject({
      name: 'redis',
      status: 'down',
      message: 'redis connection failed',
    });

    expect(result.error).toBeInstanceOf(DatabaseHealthError);
    expect(result.error).toMatchObject({
      name: 'DatabaseHealthError',
      message: 'boom',
      code: 'DATABASE_HEALTH_ERROR',
      details: {
        causeName: 'Error',
      },
    });
  });

  it('aggregates providers status in orchestrator', async () => {
    const healthyProvider = new TestProvider('postgres', async () => Promise.resolve());
    const failingProvider = new TestProvider(
      'neo4j',
      () => Promise.reject(new Error('neo4j unavailable')),
    );

    const orchestrator = new DatabaseHealthOrchestrator([healthyProvider, failingProvider]);

    const result = await orchestrator.run();
    expect(result.status).toBe('error');
    expect(result.checks).toHaveLength(2);
    expect(result.checks.find((check) => check.name === 'postgres')?.status).toBe('up');
    expect(result.checks.find((check) => check.name === 'neo4j')?.status).toBe('down');
  });
});