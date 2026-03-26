export class DatabaseHealthOrchestrator {
    providers;
    constructor(providers) {
        this.providers = providers;
    }
    async run() {
        const checks = await Promise.all(this.providers.map((provider) => provider.health()));
        const isHealthy = checks.every((check) => check.status === 'up');
        return {
            status: isHealthy ? 'ok' : 'error',
            checks,
        };
    }
}
//# sourceMappingURL=database-health.orchestrator.js.map