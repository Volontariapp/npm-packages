import type { Logger } from '@volontariapp/logger';
import { createMockLogger } from '@volontariapp/testing';

export type LoggerMock = jest.Mocked<Logger>;

export const makeLoggerMock = (): LoggerMock => {
  return createMockLogger<Logger>();
};
