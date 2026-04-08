import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { RedisProvider } from '@volontariapp/bridge';
import { BRIDGE_CONNECTION_FAILED, BRIDGE_DISCONNECTION_FAILED } from '@volontariapp/errors-nest';

@Injectable()
export class NestRedisProvider extends RedisProvider implements OnModuleInit, OnModuleDestroy {
  async onModuleInit(): Promise<void> {
    try {
      await this.connect();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Unknown connection error';
      throw BRIDGE_CONNECTION_FAILED('Redis', message);
    }
  }

  async onModuleDestroy(): Promise<void> {
    try {
      await this.disconnect();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Unknown disconnection error';
      throw BRIDGE_DISCONNECTION_FAILED('Redis', message);
    }
  }
}
