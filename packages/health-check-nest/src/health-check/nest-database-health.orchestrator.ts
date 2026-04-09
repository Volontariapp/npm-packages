import type { DatabaseHealthResult, OrchestratedHealthResult } from '@volontariapp/health-check';
import { Logger } from '@volontariapp/logger';

type DatabaseHealthRunner = {
  run(): Promise<OrchestratedHealthResult>;
};

export class NestDatabaseHealthOrchestrator {
  private readonly logger = new Logger({
    context: 'NestDatabaseHealthOrchestrator',
    format: 'json',
  });

  constructor(private readonly orchestrator: DatabaseHealthRunner) {}

  async run(): Promise<Array<Record<string, DatabaseHealthResult>>> {
    this.logger.debug('Running database health orchestrator');
    const result: OrchestratedHealthResult = await this.orchestrator.run();
    this.logger.info('Database health orchestrator completed', {
      status: result.status,
      checksCount: result.checks.length,
    });
    return result.checks.map((check: DatabaseHealthResult) => ({ [check.name]: check }));
  }
}
