import { jest } from '@jest/globals';
import type { Logger } from '@volontariapp/logger';

export type TestLoggerMock = jest.Mocked<Pick<Logger, 'info' | 'warn' | 'error'>>;

export const makeLoggerMock = (): TestLoggerMock => {
  return {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  } as unknown as TestLoggerMock;
};
