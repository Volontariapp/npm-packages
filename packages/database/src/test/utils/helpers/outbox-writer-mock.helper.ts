import { jest } from '@jest/globals';
import type { BaseRepository } from '../../../core/base.repository.js';
import type { OutboxEntity } from '../../../outbox/entities/outbox.entity.js';
import type { OutboxModel } from '../../../outbox/models/outbox.model.js';

export type OutboxWriterRepositoryMock<
  TModel extends OutboxModel,
  TEntity extends OutboxEntity,
> = jest.Mocked<
  Pick<BaseRepository<TModel, TEntity, string>, 'create' | 'createMany' | 'update' | 'delete'>
>;

export const makeOutboxWriterRepositoryMock = <
  TModel extends OutboxModel,
  TEntity extends OutboxEntity,
>(): OutboxWriterRepositoryMock<TModel, TEntity> => {
  return {
    create: jest.fn(() => Promise.resolve({} as TEntity)),
    createMany: jest.fn(() => Promise.resolve([] as TEntity[])),
    update: jest.fn(() => Promise.resolve({} as TEntity)),
    delete: jest.fn(() => Promise.resolve(true)),
  } as unknown as OutboxWriterRepositoryMock<TModel, TEntity>;
};
