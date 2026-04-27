import { jest } from '@jest/globals';
import type { OutboxEntity, OutboxModel } from '@volontariapp/database';
import { type BaseRepository } from '@volontariapp/database';
import type { QueryRunner, SelectQueryBuilder } from 'typeorm';

export type OutboxConsumerRepositoryMock<
  TModel extends ObjectLiteral,
  TEntity extends object,
> = jest.Mocked<Omit<BaseRepository<TModel, TEntity, string>, 'mapper' | 'logger'>>;

// Helper type to avoid importing ObjectLiteral from typeorm if possible
type ObjectLiteral = Record<string, unknown>;

export function makeOutboxConsumerRepositoryMock<
  TModel extends OutboxModel,
  TEntity extends OutboxEntity,
>(modelClass: typeof OutboxModel): OutboxConsumerRepositoryMock<TModel, TEntity> {
  const queryBuilderMock = {
    setLock: jest.fn().mockReturnThis(),
    setOnLocked: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([]),
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    whereInIds: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue({}),
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
    },
    executeInTransaction: jest.fn((work: (queryRunner: QueryRunner) => Promise<unknown>) =>
      work(queryRunnerMock),
    ),
    toEntities: jest.fn((models: TModel[]) => models as TEntity[]),
    toEntity: jest.fn(),
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
