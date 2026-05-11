import type { IRedisConfig } from '@volontariapp/config';
import type { BullWorkerModuleConfig } from '../interfaces/index.js';

export function createBullConfig(redis: IRedisConfig): BullWorkerModuleConfig {
  return {
    connection: {
      host: redis.host,
      port: redis.port,
      password: redis.password,
      db: redis.db ?? 0,
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      enableOfflineQueue: false,
    },
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
      removeOnComplete: true,
      removeOnFail: false,
    },
  };
}
