import { jest } from '@jest/globals';
import type { OutboxEntity, OutboxModel } from '@volontariapp/database';
import { type BaseRepository } from '@volontariapp/database';
import type { QueryRunner, SelectQueryBuilder, UpdateResult, EntityMetadata } from 'typeorm';

export type OutboxConsumerRepositoryMock<
  TModel extends OutboxModel,
  TEntity extends OutboxEntity,
> = jest.Mocked<Omit<BaseRepository<TModel, TEntity, string>, 'mapper' | 'logger'>>;

export function makeOutboxConsumerRepositoryMock<
  TModel extends OutboxModel,
  TEntity extends OutboxEntity,
>(modelClass: new () => TModel): OutboxConsumerRepositoryMock<TModel, TEntity> {
  const queryBuilderMock = {
    setLock: jest.fn().mockReturnThis(),
    setOnLocked: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getMany: jest.fn<() => Promise<TModel[]>>().mockResolvedValue([]),
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    whereInIds: jest.fn().mockReturnThis(),
    returning: jest.fn().mockReturnThis(),
    execute: jest.fn<() => Promise<UpdateResult>>().mockResolvedValue({
      raw: [{ id: 'dummy-id' }],
      generatedMaps: [],
    } as UpdateResult),
  } as unknown as SelectQueryBuilder<TModel>;

  const queryRunnerMock = {
    manager: {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilderMock),
    },
  } as unknown as QueryRunner;

  const mockRepository = {
    metadata: {
      target: modelClass,
      tableName: 'test_table',
    } as unknown as EntityMetadata,
    executeInTransaction: jest.fn(
      <T>(work: (queryRunner: QueryRunner) => Promise<T>): Promise<T> => work(queryRunnerMock),
    ),
    toEntities: jest.fn((models: TModel[]) => models as unknown as TEntity[]),
    toEntity: jest.fn((model: TModel) => model as unknown as TEntity),
    find: jest.fn(),
    findOne: jest.fn(),
    findOneOrFail: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    createMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  return mockRepository as unknown as OutboxConsumerRepositoryMock<TModel, TEntity>;
}
