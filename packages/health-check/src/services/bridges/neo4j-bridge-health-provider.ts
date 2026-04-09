import {type  Neo4jProvider } from "@volontariapp/bridge";
import { AbstractDatabaseHealthProvider } from "../database-health.provider.js";
import { InternalServerError } from "@volontariapp/errors";

export class Neo4jBridgeHealthProvider extends AbstractDatabaseHealthProvider<Neo4jProvider> {
  constructor(provider: Neo4jProvider) {
    super('neo4j', provider);
  }

  protected async pingDb(): Promise<void> {
    if (!this.client.isConnected()) {
      throw new InternalServerError(
        'Neo4j provider is not connected',
        'HEALTH_CHECK_NEO4J_NOT_CONNECTED',
      );
    }

    const driver = this.client.getDriver();
    await driver.verifyConnectivity();
  }
}
