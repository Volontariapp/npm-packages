import { jest } from '@jest/globals';

export const createMockEventEmitter = () => {
  return {
    on: jest.fn(),
    off: jest.fn(),
    once: jest.fn(),
    emit: jest.fn(),
    removeListener: jest.fn(),
    removeAllListeners: jest.fn(),
  };
};
