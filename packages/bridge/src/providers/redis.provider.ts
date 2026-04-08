import { Redis } from 'ioredis';
import { InternalServerError } from '@volontariapp/errors';
import type { IConnectionProvider } from '../interfaces/provider.interface.js';
import type { IRedisConfig } from '../interfaces/database.config.interface.js';

export class RedisProvider implements IConnectionProvider<Redis> {
  private redis: Redis | null = null;
  private connected = false;

  constructor(private readonly setup: IRedisConfig) {}

  async connect(): Promise<void> {
    try {
      if (this.connected) return;

      this.redis = new Redis({
        ...this.setup,
        lazyConnect: true,
      });

      await this.redis.connect();
      this.connected = true;
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Unknown connection error';
      throw new InternalServerError(
        `Failed to connect to Redis: ${message}`,
        'REDIS_CONNECTION_ERROR',
        { cause: e },
      );
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (!this.connected || !this.redis) return;
      await this.redis.quit();
      this.connected = false;
      this.redis = null;
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Unknown disconnection error';
      throw new InternalServerError(
        `Failed to disconnect from Redis: ${message}`,
        'REDIS_DISCONNECTION_ERROR',
        { cause: e },
      );
    }
  }

  getDriver(): Redis {
    if (!this.connected || !this.redis) {
      throw new InternalServerError(
        'Redis driver not initialized. Call connect() first.',
        'REDIS_NOT_INITIALIZED',
      );
    }
    return this.redis;
  }

  isConnected(): boolean {
    return this.connected;
  }
}
