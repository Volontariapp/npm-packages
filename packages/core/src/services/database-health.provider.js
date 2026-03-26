export class AbstractDatabaseHealthProvider {
    name;
    client;
    constructor(name, client) {
        this.name = name;
        this.client = client;
    }
    async health() {
        try {
            await this.pingDb();
            return {
                name: this.name,
                status: 'up',
                message: `${this.name} connection is healthy`,
            };
        }
        catch (error) {
            const normalizedError = this.normalizeError(error);
            return {
                name: this.name,
                status: 'down',
                message: `${this.name} connection failed`,
                error: normalizedError,
            };
        }
    }
    normalizeError(error) {
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
//# sourceMappingURL=database-health.provider.js.map