import type { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { PostgresProvider } from '@volontariapp/bridge';
import { BRIDGE_CONNECTION_FAILED, BRIDGE_DISCONNECTION_FAILED } from '@volontariapp/errors-nest';

@Injectable()
export class NestPostgresProvider
  extends PostgresProvider
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit(): Promise<void> {
    try {
      await this.connect();
      this.logger.info('Nest Postgres Bridge initialized successfully');
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Unknown connection error';
      throw BRIDGE_CONNECTION_FAILED('Postgres', message);
    }
  }

  async onModuleDestroy(): Promise<void> {
    try {
      await this.disconnect();
      this.logger.info('Nest Postgres Bridge destroyed successfully');
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Unknown disconnection error';
      throw BRIDGE_DISCONNECTION_FAILED('Postgres', message);
    }
  }
}
