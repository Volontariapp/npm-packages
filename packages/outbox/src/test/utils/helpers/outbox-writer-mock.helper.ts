import { jest } from '@jest/globals';
import { OutboxEntity, OutboxModel, type BaseRepository } from '@volontariapp/database';

export type OutboxWriterRepositoryMock<
  TModel extends OutboxModel,
  TEntity extends OutboxEntity,
> = jest.Mocked<
  Pick<BaseRepository<TModel, TEntity, string>, 'create' | 'createMany' | 'update' | 'delete'>
>;

export const makeOutboxWriterRepositoryMock = <
  TModel extends OutboxModel,
  TEntity extends OutboxEntity,
>(
  repository: unknown,
): OutboxWriterRepositoryMock<TModel, TEntity> => {
  return {
    create: jest.fn(async () => ({}) as TEntity),
    createMany: jest.fn(async () => [] as TEntity[]),
    update: jest.fn(async () => ({}) as TEntity),
    delete: jest.fn(async () => true),
  } as unknown as OutboxWriterRepositoryMock<TModel, TEntity>;
};
