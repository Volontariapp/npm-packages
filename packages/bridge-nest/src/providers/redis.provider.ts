import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { RedisProvider } from '@volontariapp/bridge';
import { BRIDGE_DISCONNECTION_FAILED } from '@volontariapp/errors-nest';

@Injectable()
export class NestRedisProvider extends RedisProvider implements OnModuleInit, OnModuleDestroy {
  async onModuleInit(): Promise<void> {
    try {
      await this.connect();
      this.logger.info('Nest Redis Bridge initialized successfully');
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Unknown connection error';
      this.logger.error(`Nest Redis Bridge failed to initialize: ${message}`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    try {
      await this.disconnect();
      this.logger.info('Nest Redis Bridge destroyed successfully');
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Unknown disconnection error';
      throw BRIDGE_DISCONNECTION_FAILED('Redis', message);
    }
  }
}
