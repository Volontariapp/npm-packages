import { createMockLogger } from '@volontariapp/testing';
import type { Logger } from '@volontariapp/logger';

export type LoggerMock = jest.Mocked<Logger>;

export const makeLoggerMock = (): LoggerMock => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  return createMockLogger<Logger>() as unknown as LoggerMock;
};
