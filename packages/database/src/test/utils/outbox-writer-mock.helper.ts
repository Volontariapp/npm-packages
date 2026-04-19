import { jest } from '@jest/globals';
import { BaseRepository } from '../../core/base.repository.js';
import { OutboxEntity } from "../../outbox/entities/outbox.entity.js";
import { OutboxModel } from "../../outbox/models/outbox.model.js";

export type OutboxWriterRepositoryMock<TModel extends OutboxModel, TEntity extends OutboxEntity> = jest.Mocked<
  Pick<BaseRepository<TModel, TEntity, string>, 'create' | 'createMany' | 'update' | 'delete'>
>;

export const makeOutboxWriterRepositoryMock = <
  TModel extends OutboxModel,
  TEntity extends OutboxEntity,
>(): OutboxWriterRepositoryMock<TModel, TEntity> => {
  return {
    create: jest.fn(async () => ({} as TEntity)),
    createMany: jest.fn(async () => [] as TEntity[]),
    update: jest.fn(async () => ({} as TEntity)),
    delete: jest.fn(async () => true),
  } as unknown as OutboxWriterRepositoryMock<TModel, TEntity>;
};
