import { jest } from '@jest/globals';
import { NestRedisProvider } from '../../../providers/redis.provider.js';

describe('NestRedisProvider (Unit)', () => {
  let provider: NestRedisProvider;
  const config = {
    host: 'localhost',
    port: 6379,
  };

  beforeEach(() => {
    provider = new NestRedisProvider(config);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should call connect on initialization', async () => {
    const connectSpy = jest.spyOn(provider, 'connect').mockImplementation(async () => {});
    const logSpy = jest
      .spyOn((provider as unknown as { logger: { info: (msg: string) => void } }).logger, 'info')
      .mockImplementation(() => {});

    await provider.onModuleInit();

    expect(connectSpy).toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith('Nest Redis Bridge initialized successfully');
  });

  it('should throw error when connection fails', async () => {
    jest.spyOn(provider, 'connect').mockRejectedValue(new Error('Connection failed'));

    await expect(provider.onModuleInit()).rejects.toThrow();
  });

  it('should handle non-Error catch in onModuleInit', async () => {
    jest.spyOn(provider, 'connect').mockRejectedValue('String error');

    await expect(provider.onModuleInit()).rejects.toThrow();
  });

  it('should call disconnect on destruction', async () => {
    const disconnectSpy = jest.spyOn(provider, 'disconnect').mockImplementation(async () => {});
    const logSpy = jest
      .spyOn((provider as unknown as { logger: { info: (msg: string) => void } }).logger, 'info')
      .mockImplementation(() => {});

    await provider.onModuleDestroy();

    expect(disconnectSpy).toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith('Nest Redis Bridge destroyed successfully');
  });

  it('should throw error when disconnection fails', async () => {
    jest.spyOn(provider, 'disconnect').mockRejectedValue(new Error('Disconnection failed'));

    await expect(provider.onModuleDestroy()).rejects.toThrow();
  });

  it('should handle non-Error catch in onModuleDestroy', async () => {
    jest.spyOn(provider, 'disconnect').mockRejectedValue('String error');

    await expect(provider.onModuleDestroy()).rejects.toThrow();
  });
});
