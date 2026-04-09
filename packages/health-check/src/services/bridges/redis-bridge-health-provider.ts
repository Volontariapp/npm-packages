import { type RedisProvider } from "@volontariapp/bridge";
import { AbstractDatabaseHealthProvider } from "../database-health.provider.js";
import { InternalServerError } from "@volontariapp/errors";

export class RedisBridgeHealthProvider extends AbstractDatabaseHealthProvider<RedisProvider> {
  constructor(provider: RedisProvider) {
    super('redis', provider);
  }

  protected async pingDb(): Promise<void> {
    if (!this.client.isConnected()) {
      throw new InternalServerError(
        'Redis provider is not connected',
        'HEALTH_CHECK_REDIS_NOT_CONNECTED',
      );
    }

    const driver = this.client.getDriver();
    await driver.ping();
  }
}
