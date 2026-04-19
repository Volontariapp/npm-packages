import { jest } from '@jest/globals';

type LoggerLike = {
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
};

export type TestLoggerMock = LoggerLike & jest.Mocked<Pick<LoggerLike, 'info' | 'warn' | 'error'>>;

export const makeLoggerMock = (): TestLoggerMock => {
  return {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  } as unknown as TestLoggerMock;
};
