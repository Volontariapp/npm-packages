import type { jest } from '@jest/globals';
import { createMock } from '@volontariapp/testing';
import type { Logger } from '@volontariapp/logger';

export type LoggerMock = jest.Mocked<Logger>;

export const makeLoggerMock = (): LoggerMock => {
  return createMock<Logger>();
};
