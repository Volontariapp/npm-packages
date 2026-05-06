import type { jest } from '@jest/globals';
import { createMock } from '@volontariapp/database/testing';
import type { Redis, ChainableCommander } from 'ioredis';

export type RedisMock = jest.Mocked<Redis>;
export type PipelineMock = jest.Mocked<ChainableCommander>;

export const makeRedisMock = (): RedisMock => {
  return createMock<Redis>();
};

export const makePipelineMock = (): PipelineMock => {
  const mock = createMock<ChainableCommander>();
  mock.xadd.mockReturnThis();
  return mock;
};
