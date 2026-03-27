import type { AbstractDatabaseHealthProvider, DatabaseHealthResult } from './database-health.provider.js';

export interface OrchestratedHealthResult {
  status: 'ok' | 'error';
  checks: DatabaseHealthResult[];
}

export class DatabaseHealthOrchestrator {
  constructor(
    private readonly providers: ReadonlyArray<AbstractDatabaseHealthProvider>,
  ) {}

  async run(): Promise<OrchestratedHealthResult> {
    const checks = await Promise.all(this.providers.map((provider) => provider.health()));
    const isHealthy = checks.every((check) => check.status === 'up');

    return {
      status: isHealthy ? 'ok' : 'error',
      checks,
    };
  }
}
