import type { IRedisConfig } from '@volontariapp/config';

export interface WorkerAppConfig {
  redis: IRedisConfig;
  concurrency?: number;
}
