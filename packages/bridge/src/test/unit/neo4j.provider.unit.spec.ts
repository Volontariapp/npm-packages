import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { Neo4jProvider } from '../../providers/neo4j.provider.js';
import { InternalServerError } from '@volontariapp/errors';
import neo4j from 'neo4j-driver';
import type { INeo4jConfig } from '@volontariapp/config';

describe('Neo4jProvider Unit Tests', () => {
  let provider: Neo4jProvider;
  const config: INeo4jConfig = {
    url: 'bolt://localhost:7687',
    authToken: {
      principal: 'neo4j',
      credentials: 'password',
    },
    config: { maxConnectionPoolSize: 100 },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    provider = new Neo4jProvider(config);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('connect', () => {
    it('should instantiate Driver, call verifyConnectivity and set connected to true', async () => {
      const verifyMock = jest.fn().mockResolvedValue(undefined as never);
      jest
        .spyOn(neo4j, 'driver')
        .mockReturnValue({ verifyConnectivity: verifyMock } as unknown as neo4j.Driver);

      await provider.connect();
      expect(provider.isConnected()).toBe(true);
      expect(verifyMock).toHaveBeenCalled();
    });

    it('should not initialize again if already connected', async () => {
      const verifyMock = jest.fn().mockResolvedValue(undefined as never);
      jest
        .spyOn(neo4j, 'driver')
        .mockReturnValue({ verifyConnectivity: verifyMock } as unknown as neo4j.Driver);
      await provider.connect();
      verifyMock.mockClear();

      await provider.connect();
      expect(verifyMock).not.toHaveBeenCalled();
    });

    it('should throw InternalServerError when connection fails', async () => {
      const verifyMock = jest.fn().mockRejectedValue(new Error('Connection Failed') as never);
      jest
        .spyOn(neo4j, 'driver')
        .mockReturnValue({ verifyConnectivity: verifyMock } as unknown as neo4j.Driver);

      await expect(provider.connect()).rejects.toThrow(InternalServerError);
    });
  });

  describe('disconnect', () => {
    it('should do nothing if not connected', async () => {
      await provider.disconnect();
      expect(provider.isConnected()).toBe(false);
    });

    it('should close the driver and set connected to false', async () => {
      const verifyMock = jest.fn().mockResolvedValue(undefined as never);
      const closeMock = jest.fn().mockResolvedValue(undefined as never);
      jest.spyOn(neo4j, 'driver').mockReturnValue({
        verifyConnectivity: verifyMock,
        close: closeMock,
      } as unknown as neo4j.Driver);
      await provider.connect();

      await provider.disconnect();

      expect(closeMock).toHaveBeenCalled();
      expect(provider.isConnected()).toBe(false);
      expect(() => provider.getDriver()).toThrow(InternalServerError);
    });

    it('should throw InternalServerError when disconnection fails', async () => {
      const verifyMock = jest.fn().mockResolvedValue(undefined as never);
      const closeMock = jest.fn().mockRejectedValue(new Error('Disconnection Failed') as never);
      jest.spyOn(neo4j, 'driver').mockReturnValue({
        verifyConnectivity: verifyMock,
        close: closeMock,
      } as unknown as neo4j.Driver);

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
