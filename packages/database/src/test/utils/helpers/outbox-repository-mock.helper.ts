import type { jest } from '@jest/globals';
import type { BaseRepository } from '../../../core/base.repository.js';
import type { OutboxEntity } from '../../../outbox/entities/outbox.entity.js';
import type { OutboxModel } from '../../../outbox/models/outbox.model.js';
import { createMock } from './mock.helper.js';

export type OutboxRepositoryMock<
  TModel extends OutboxModel,
  TEntity extends OutboxEntity,
> = jest.Mocked<BaseRepository<TModel, TEntity, string>>;

export const makeOutboxRepositoryMock = <
  TModel extends OutboxModel,
  TEntity extends OutboxEntity,
>(): OutboxRepositoryMock<TModel, TEntity> => {
  return createMock<BaseRepository<TModel, TEntity, string>>();
};
