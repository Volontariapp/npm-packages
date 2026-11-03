import { jest } from '@jest/globals';
import type { Repository } from 'typeorm';

export interface PaginationTestModel {
  id: number;
  name: string;
}

export class PaginationTestEntity {
  id: number = 0;
  name: string = '';
}

export class PaginationTestModelClass implements PaginationTestModel {
  id!: number;
  name: string = '';
}

/** Repository TypeORM minimal dont seules les methodes de pagination sont simulees. */
export function createTypeOrmRepositoryMock(
  primaryColumns: Array<{ propertyName: string }>,
): jest.Mocked<Repository<PaginationTestModel>> {
  return {
    metadata: {
      primaryColumns,
      name: 'PaginationTestModel',
      tableName: 'pagination_test',
      columns: [],
      relations: [],
    },
    findAndCount: jest.fn(),
  } as unknown as jest.Mocked<Repository<PaginationTestModel>>;
}
