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
export declare abstract class AbstractDatabaseHealthProvider<TClient = unknown> {
    readonly name: string;
    protected readonly client: TClient;
    protected constructor(name: string, client: TClient);
    protected abstract pingDb(): Promise<void>;
    health(): Promise<DatabaseHealthResult>;
    private normalizeError;
}
//# sourceMappingURL=database-health.provider.d.ts.map