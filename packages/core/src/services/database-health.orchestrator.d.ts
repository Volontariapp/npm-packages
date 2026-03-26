import type { AbstractDatabaseHealthProvider, DatabaseHealthResult } from './database-health.provider.js';
export interface OrchestratedHealthResult {
    status: 'ok' | 'error';
    checks: DatabaseHealthResult[];
}
export declare class DatabaseHealthOrchestrator {
    private readonly providers;
    constructor(providers: ReadonlyArray<AbstractDatabaseHealthProvider>);
    run(): Promise<OrchestratedHealthResult>;
}
//# sourceMappingURL=database-health.orchestrator.d.ts.map