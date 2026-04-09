import { InternalServerError } from "@volontariapp/errors";
import { AbstractDatabaseHealthProvider } from "../database-health.provider.js";
import { type PostgresProvider } from "@volontariapp/bridge";

export class PostgresBridgeHealthProvider extends AbstractDatabaseHealthProvider<PostgresProvider> {
  constructor(provider: PostgresProvider) {
    super('postgres', provider);
  }

  protected async pingDb(): Promise<void> {
    if (!this.client.isConnected()) {
      throw new InternalServerError(
        'Postgres provider is not connected',
        'HEALTH_CHECK_POSTGRES_NOT_CONNECTED',
      );
    }

    const driver = this.client.getDriver();
    await driver.query('SELECT 1');
  }
}
