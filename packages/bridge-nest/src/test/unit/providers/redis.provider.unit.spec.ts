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

  it('should log error when connection fails', async () => {
    jest.spyOn(provider, 'connect').mockRejectedValue(new Error('Connection failed'));
    const logSpy = jest
      .spyOn((provider as unknown as { logger: { error: (msg: string) => void } }).logger, 'error')
      .mockImplementation(() => {});

    await provider.onModuleInit();

    expect(logSpy).toHaveBeenCalledWith(
      'Nest Redis Bridge failed to initialize: Connection failed',
    );
  });

  it('should handle non-Error catch in onModuleInit', async () => {
    jest.spyOn(provider, 'connect').mockRejectedValue('String error');
    const logSpy = jest
      .spyOn((provider as unknown as { logger: { error: (msg: string) => void } }).logger, 'error')
      .mockImplementation(() => {});

    await provider.onModuleInit();

    expect(logSpy).toHaveBeenCalledWith(
      'Nest Redis Bridge failed to initialize: Unknown connection error',
    );
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
