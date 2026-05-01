import type { jest } from '@jest/globals';
import type { Logger } from '@volontariapp/logger';
import { createMock } from './mock.helper.js';

export type LoggerMock = jest.Mocked<Logger>;

export const makeLoggerMock = (): LoggerMock => {
  return createMock<Logger>();
};
