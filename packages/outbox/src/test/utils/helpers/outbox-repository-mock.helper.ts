import type { jest } from '@jest/globals';
import type { OutboxEntity, BaseRepository, OutboxModel } from '@volontariapp/database';
import { createMock } from '@volontariapp/database/testing';

export type OutboxRepositoryMock<
  TEntity extends OutboxEntity,
  TModel extends OutboxModel = OutboxModel,
> = jest.Mocked<BaseRepository<TModel, TEntity, string>>;

export const makeOutboxRepositoryMock = <
  TEntity extends OutboxEntity,
  TModel extends OutboxModel = OutboxModel,
>(): OutboxRepositoryMock<TEntity, TModel> => {
  return createMock<BaseRepository<TModel, TEntity, string>>();
};
