import { jest } from '@jest/globals';
import { Logger } from '@volontariapp/logger';

export const makeLoggerMock = (): Logger => {
  const logger = new Logger({ minLevel: 'fatal' });
  jest.spyOn(logger, 'info').mockImplementation(() => {});
  jest.spyOn(logger, 'warn').mockImplementation(() => {});
  jest.spyOn(logger, 'error').mockImplementation(() => {});
  jest.spyOn(logger, 'debug').mockImplementation(() => {});
  jest.spyOn(logger, 'fatal').mockImplementation(() => {});
  jest.spyOn(logger, 'verbose').mockImplementation(() => {});
  jest.spyOn(logger, 'log').mockImplementation(() => {});
  return logger;
};
