import { describe, it, expect } from '@jest/globals';
import { createBullConfig } from '../../../utils/bull-config.utils.js';

describe('bull-config.utils', () => {
  describe('createBullConfig', () => {
    it('should map IRedisConfig to BullWorkerModuleConfig correctly', () => {
      const redisConfig = {
        host: 'localhost',
        port: 6379,
        password: 'pass',
        db: 1,
      };

      const result = createBullConfig(redisConfig);

      expect(result).toEqual({
        connection: {
          host: 'localhost',
          port: 6379,
          password: 'pass',
          db: 1,
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
      });
    });

    it('should default db to 0 if db is not provided', () => {
      const redisConfig = {
        host: 'localhost',
        port: 6379,
        password: 'pass',
      };

      const result = createBullConfig(redisConfig);

      expect(result.connection.db).toBe(0);
    });
  });
});
