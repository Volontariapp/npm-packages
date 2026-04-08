import type { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { Neo4jProvider } from '@volontariapp/bridge';
import { BRIDGE_CONNECTION_FAILED, BRIDGE_DISCONNECTION_FAILED } from '@volontariapp/errors-nest';

@Injectable()
export class NestNeo4jProvider extends Neo4jProvider implements OnModuleInit, OnModuleDestroy {
  async onModuleInit(): Promise<void> {
    try {
      await this.connect();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Unknown connection error';
      throw BRIDGE_CONNECTION_FAILED('Neo4j', message);
    }
  }

  async onModuleDestroy(): Promise<void> {
    try {
      await this.disconnect();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Unknown disconnection error';
      throw BRIDGE_DISCONNECTION_FAILED('Neo4j', message);
    }
  }
}
