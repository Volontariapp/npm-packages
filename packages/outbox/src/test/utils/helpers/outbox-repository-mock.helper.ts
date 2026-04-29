import { jest } from '@jest/globals';
import type { OutboxEntity } from '@volontariapp/database';

export type OutboxRepositoryMock<TEntity extends OutboxEntity> = {
  create: jest.MockedFunction<(data: Partial<TEntity>) => Promise<TEntity>>;
  createMany: jest.MockedFunction<(dataArray: Partial<TEntity>[]) => Promise<TEntity[]>>;
  update: jest.MockedFunction<(id: string, data: Partial<TEntity>) => Promise<TEntity | null>>;
  delete: jest.MockedFunction<(id: string) => Promise<boolean>>;
};

export const makeOutboxRepositoryMock = <
  TEntity extends OutboxEntity,
>(): OutboxRepositoryMock<TEntity> => {
  return {
    create: jest.fn(() => Promise.resolve({} as TEntity)),
    createMany: jest.fn(() => Promise.resolve([] as TEntity[])),
    update: jest.fn(() => Promise.resolve({} as TEntity)),
    delete: jest.fn(() => Promise.resolve(true)),
  };
};
