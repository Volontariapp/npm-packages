import type { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { Neo4jProvider } from '@volontariapp/bridge';
import { BRIDGE_DISCONNECTION_FAILED } from '@volontariapp/errors-nest';

@Injectable()
export class NestNeo4jProvider extends Neo4jProvider implements OnModuleInit, OnModuleDestroy {
  async onModuleInit(): Promise<void> {
    try {
      await this.connect();
      this.logger.info('Nest Neo4j Bridge initialized successfully');
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Unknown connection error';
      this.logger.error(`Nest Neo4j Bridge failed to initialize: ${message}`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    try {
      await this.disconnect();
      this.logger.info('Nest Neo4j Bridge destroyed successfully');
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Unknown disconnection error';
      throw BRIDGE_DISCONNECTION_FAILED('Neo4j', message);
    }
  }
}
