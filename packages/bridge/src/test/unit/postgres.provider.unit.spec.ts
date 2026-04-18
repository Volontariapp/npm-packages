import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { PostgresProvider } from '../../providers/postgres.provider.js';
import { InternalServerError } from '@volontariapp/errors';
import { DataSource } from 'typeorm';
import type { IPostgresConfig } from '@volontariapp/config';
import { postgresConfig } from '../integration/config.example.js';

describe('PostgresProvider Unit Tests', () => {
  let provider: PostgresProvider;
  const config: IPostgresConfig = postgresConfig;

  beforeEach(() => {
    jest.clearAllMocks();
    provider = new PostgresProvider(config);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('connect', () => {
    it('should initialize data source and set connected status to true', async () => {
      const initializeSpy = jest
        .spyOn(DataSource.prototype, 'initialize')
        .mockResolvedValue(undefined as never);
      await provider.connect();
      expect(provider.isConnected()).toBe(true);
      expect(initializeSpy).toHaveBeenCalled();
    });

    it('should not initialize again if already connected', async () => {
      const initializeSpy = jest
        .spyOn(DataSource.prototype, 'initialize')
        .mockResolvedValue(undefined as never);
      await provider.connect();
      initializeSpy.mockClear();

      await provider.connect();
      expect(initializeSpy).not.toHaveBeenCalled();
    });

    it('should throw InternalServerError when connection fails', async () => {
      jest
        .spyOn(DataSource.prototype, 'initialize')
        .mockRejectedValue(new Error('Connection Failed') as never);
      provider = new PostgresProvider(config);

      await expect(provider.connect()).rejects.toThrow(InternalServerError);
    });
  });

  describe('disconnect', () => {
    it('should do nothing if not connected', async () => {
      const destroySpy = jest
        .spyOn(DataSource.prototype, 'destroy')
        .mockResolvedValue(undefined as never);
      provider = new PostgresProvider(config);

      await provider.disconnect();
      expect(destroySpy).not.toHaveBeenCalled();
    });

    it('should destroy the data source and set connected to false', async () => {
      jest.spyOn(DataSource.prototype, 'initialize').mockResolvedValue(undefined as never);
      const destroySpy = jest
        .spyOn(DataSource.prototype, 'destroy')
        .mockResolvedValue(undefined as never);
      await provider.connect();

      await provider.disconnect();

      expect(destroySpy).toHaveBeenCalled();
      expect(provider.isConnected()).toBe(false);
    });

    it('should throw InternalServerError when disconnection fails', async () => {
      jest.spyOn(DataSource.prototype, 'initialize').mockResolvedValue(undefined as never);
      jest
        .spyOn(DataSource.prototype, 'destroy')
        .mockRejectedValue(new Error('Disconnection Failed'));
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
