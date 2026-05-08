import type { jest } from '@jest/globals';
import { createMock } from './mock.helper.js';

export interface IMockLogger {
  log: jest.Mock;
  debug: jest.Mock;
  info: jest.Mock;
  warn: jest.Mock;
  error: jest.Mock;
  fatal: jest.Mock;
  verbose: jest.Mock;
  [key: string]: unknown;
}

export type LoggerMock<T extends object = IMockLogger> = jest.Mocked<T>;

export const createMockLogger = <T extends object = IMockLogger>(): LoggerMock<T> => {
  return createMock<T>();
};
