import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { RedisProvider } from '../../providers/redis.provider.js';
import { InternalServerError } from '@volontariapp/errors';
import { Redis } from 'ioredis';
import type { IRedisConfig } from '@volontariapp/config';

describe('RedisProvider Unit Tests', () => {
  let provider: RedisProvider;
  const config: IRedisConfig = {
    host: 'localhost',
    port: 6379,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    provider = new RedisProvider(config);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('connect', () => {
    it('should instantiate Redis, call connect and set connected status to true', async () => {
      const connectSpy = jest
        .spyOn(Redis.prototype, 'connect')
        .mockResolvedValue(undefined as never);
      await provider.connect();
      expect(provider.isConnected()).toBe(true);
      expect(connectSpy).toHaveBeenCalled();
    });

    it('should not initialize again if already connected', async () => {
      const connectSpy = jest
        .spyOn(Redis.prototype, 'connect')
        .mockResolvedValue(undefined as never);
      await provider.connect();
      connectSpy.mockClear();

      await provider.connect();
      expect(connectSpy).not.toHaveBeenCalled();
    });

    it('should throw InternalServerError when connection fails', async () => {
      jest.spyOn(Redis.prototype, 'connect').mockRejectedValue(new Error('Connection Failed'));

      await expect(provider.connect()).rejects.toThrow(InternalServerError);
    });
  });

  describe('disconnect', () => {
    it('should do nothing if not connected', async () => {
      const quitSpy = jest.spyOn(Redis.prototype, 'quit').mockResolvedValue('OK');
      await provider.disconnect();
      expect(quitSpy).not.toHaveBeenCalled();
      expect(provider.isConnected()).toBe(false);
    });

    it('should quit the redis instance and set connected to false', async () => {
      jest.spyOn(Redis.prototype, 'connect').mockResolvedValue(undefined);
      const quitSpy = jest.spyOn(Redis.prototype, 'quit').mockResolvedValue('OK');
      await provider.connect();

      await provider.disconnect();

      expect(quitSpy).toHaveBeenCalled();
      expect(provider.isConnected()).toBe(false);
      expect(() => provider.getDriver()).toThrow(InternalServerError);
    });

    it('should throw InternalServerError when disconnection fails', async () => {
      jest.spyOn(Redis.prototype, 'connect').mockResolvedValue(undefined);
      jest.spyOn(Redis.prototype, 'quit').mockRejectedValue(new Error('Disconnection Failed'));
      await provider.connect();

      await expect(provider.disconnect()).rejects.toThrow(InternalServerError);
    });
  });

  describe('getDriver', () => {
    it('should throw InternalServerError if not connected', () => {
      expect(() => provider.getDriver()).toThrow(InternalServerError);
    });
  });
});
