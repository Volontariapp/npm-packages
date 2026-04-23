import { jest } from '@jest/globals';
import { OutboxEntity, OutboxModel } from '@volontariapp/database';

export type OutboxWriterRepositoryMock<
  _TModel extends OutboxModel,
  TEntity extends OutboxEntity,
> = {
  create: jest.MockedFunction<(data: Partial<TEntity>) => Promise<TEntity>>;
  createMany: jest.MockedFunction<(dataArray: Partial<TEntity>[]) => Promise<TEntity[]>>;
  update: jest.MockedFunction<(id: string, data: Partial<TEntity>) => Promise<TEntity | null>>;
  delete: jest.MockedFunction<(id: string) => Promise<boolean>>;
};

export const makeOutboxWriterRepositoryMock = <
  _TModel extends OutboxModel,
  TEntity extends OutboxEntity,
>(): OutboxWriterRepositoryMock<_TModel, TEntity> => {
  return {
    create: jest.fn(async () => ({}) as TEntity),
    createMany: jest.fn(async () => [] as TEntity[]),
    update: jest.fn(async () => ({}) as TEntity),
    delete: jest.fn(async () => true),
  };
};
