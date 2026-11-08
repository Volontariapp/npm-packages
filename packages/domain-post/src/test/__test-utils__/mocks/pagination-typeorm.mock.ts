import { jest } from '@jest/globals';
import type { Repository, ObjectLiteral } from '@volontariapp/database';
import type { SelectQueryBuilder } from 'typeorm';

export interface ChainableQueryBuilderMock<T extends ObjectLiteral> {
  builder: SelectQueryBuilder<T>;
  orderBy: jest.Mock;
  addOrderBy: jest.Mock;
  /** Lignes de la page. */
  getMany: jest.Mock<() => Promise<unknown[]>>;
  /** Resultat du COUNT(*) : { total } en texte comme le renvoie Postgres, ou undefined. */
  getRawOne: jest.Mock<() => Promise<{ total: string } | undefined>>;
}

/** QueryBuilder chainable dont seules les methodes de listPaginated sont simulees. */
export const createChainableQueryBuilderMock = <
  T extends ObjectLiteral,
>(): ChainableQueryBuilderMock<T> => {
  const qb = {
    leftJoinAndSelect: jest.fn(),
    skip: jest.fn(),
    take: jest.fn(),
    orderBy: jest.fn(),
    addOrderBy: jest.fn(),
    andWhere: jest.fn(),
    select: jest.fn(),
    getManyAndCount: jest.fn<() => Promise<[unknown[], number]>>(),
    getMany: jest.fn<() => Promise<unknown[]>>(),
    getRawOne: jest.fn<() => Promise<{ total: string } | undefined>>(),
  };
  qb.leftJoinAndSelect.mockReturnValue(qb);
  qb.skip.mockReturnValue(qb);
  qb.take.mockReturnValue(qb);
  qb.orderBy.mockReturnValue(qb);
  qb.addOrderBy.mockReturnValue(qb);
  qb.andWhere.mockReturnValue(qb);
  qb.select.mockReturnValue(qb);
  qb.getManyAndCount.mockResolvedValue([[], 0]);
  qb.getMany.mockResolvedValue([]);
  qb.getRawOne.mockResolvedValue({ total: '0' });
  return {
    builder: qb as unknown as SelectQueryBuilder<T>,
    orderBy: qb.orderBy,
    addOrderBy: qb.addOrderBy,
    getMany: qb.getMany,
    getRawOne: qb.getRawOne,
  };
};

/** Repository TypeORM minimal pour les tests de pagination. */
export const createPaginationTypeOrmRepositoryMock = <T extends ObjectLiteral>(
  name: string,
): jest.Mocked<Repository<T>> =>
  ({
    metadata: {
      tableName: name,
      name,
      primaryColumns: [{ propertyName: 'id' }],
      columns: [],
      relations: [],
    },
    findAndCount: jest.fn(),
    createQueryBuilder: jest.fn(),
  }) as unknown as jest.Mocked<Repository<T>>;
