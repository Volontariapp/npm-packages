import { jest, describe, it, expect, beforeEach, beforeAll } from '@jest/globals';
import type { Repository, UpdateResult, DeleteResult } from 'typeorm';
import { BaseRepository } from '../../core/base.repository.js';
import { databaseMapper } from '../../core/mapper.service.js';

class MockModel {
  id!: number;
  name: string = '';
}

class MockEntity {
  id: number = 0;
  name: string = '';
}

class TestRepository extends BaseRepository<MockModel, MockEntity> {
  public testBuildIdWhere(id: number) {
    return this.buildIdWhere(id);
  }
}

describe('Base Repository (Unit)', () => {
  let repository: TestRepository;
  let mockTypeOrmRepo: jest.Mocked<Repository<MockModel>>;

  beforeAll(() => {
    databaseMapper.registerBidirectional(MockModel, MockEntity);
  });

  beforeEach(() => {
    mockTypeOrmRepo = {
      metadata: {
        primaryColumns: [{ propertyName: 'id' }],
        name: 'MockModel',
        tableName: 'mock_table',
        columns: [
          { propertyName: 'name', type: 'varchar' },
          { propertyName: 'id', type: 'int' },
        ],
      },
      find: jest.fn(),
      findOneBy: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      softDelete: jest.fn(),
      restore: jest.fn(),
      count: jest.fn(),
      findAndCount: jest.fn(),
      upsert: jest.fn(),
      createQueryBuilder: jest.fn(),
    } as unknown as jest.Mocked<Repository<MockModel>>;

    repository = new TestRepository(mockTypeOrmRepo, MockEntity, MockModel);
    jest.restoreAllMocks();
  });

  it('should throw error if no primary key is defined', () => {
    const meta = mockTypeOrmRepo.metadata as unknown as { primaryColumns: unknown[] };
    meta.primaryColumns = [];
    expect(() => repository.testBuildIdWhere(1)).toThrow('No primary key defined on MockModel');
  });

  it('findOneWithOptions() and findWithRelations() should return null if no model found', async () => {
    const spy = jest.spyOn(mockTypeOrmRepo, 'findOne').mockResolvedValue(null);
    expect(await repository.findOneWithOptions({ where: { id: 1 } })).toBeNull();
    expect(await repository.findWithRelations({ id: 1 }, ['profile'])).toBeNull();
    expect(spy).toHaveBeenCalled();
  });

  it('upsert() branch coverage: pk success and fallbacks', async () => {
    const successModel = { id: 1, name: 'Success' } as MockModel;
    const upsertSpy = jest
      .spyOn(mockTypeOrmRepo, 'upsert')
      .mockResolvedValue({} as unknown as never);
    const findOneBySpy = jest.spyOn(mockTypeOrmRepo, 'findOneBy').mockResolvedValue(successModel);

    const result = await repository.upsert({ id: 1, name: 'Success' }, ['id']);
    expect(result.id).toBe(1);
    expect(upsertSpy).toHaveBeenCalled();
    expect(findOneBySpy).toHaveBeenCalled();

    findOneBySpy.mockResolvedValue(null);
    const resultNull = await repository.upsert({ id: 1, name: 'NullFound' }, ['id']);
    expect(resultNull.name).toBe('NullFound');

    const resultNoPk = await repository.upsert({ name: 'NoPK' }, ['name']);
    expect(resultNoPk.name).toBe('NoPK');
  });

  it('delete/softDelete/restore branch coverage for affected counts', async () => {
    const deleteSpy = jest
      .spyOn(mockTypeOrmRepo, 'delete')
      .mockResolvedValue({ affected: 1 } as DeleteResult);
    expect(await repository.delete(1)).toBe(true);
    expect(deleteSpy).toHaveBeenCalled();

    deleteSpy.mockResolvedValue({ affected: 0 } as DeleteResult);
    expect(await repository.delete(1)).toBe(false);

    deleteSpy.mockResolvedValue({ affected: null } as unknown as DeleteResult);
    expect(await repository.delete(1)).toBe(false);

    const softDeleteSpy = jest
      .spyOn(mockTypeOrmRepo, 'softDelete')
      .mockResolvedValue({ affected: 1 } as UpdateResult);
    expect(await repository.softDelete(1)).toBe(true);
    expect(softDeleteSpy).toHaveBeenCalled();

    softDeleteSpy.mockResolvedValue({ affected: 0 } as UpdateResult);
    expect(await repository.softDelete(1)).toBe(false);

    softDeleteSpy.mockResolvedValue({ affected: null } as unknown as UpdateResult);
    expect(await repository.softDelete(1)).toBe(false);

    const restoreSpy = jest
      .spyOn(mockTypeOrmRepo, 'restore')
      .mockResolvedValue({ affected: 1 } as UpdateResult);
    expect(await repository.restore(1)).toBe(true);
    expect(restoreSpy).toHaveBeenCalled();

    restoreSpy.mockResolvedValue({ affected: undefined } as unknown as UpdateResult);
    expect(await repository.restore(1)).toBe(false);

    restoreSpy.mockResolvedValue({ affected: null } as unknown as UpdateResult);
    expect(await repository.restore(1)).toBe(false);
  });

  it('paginate() branch coverage for different pages', async () => {
    const spy = jest
      .spyOn(mockTypeOrmRepo, 'findAndCount')
      .mockResolvedValue([[new MockModel()], 25]);

    const firstPage = await repository.paginate({ page: 1, limit: 10 });
    expect(firstPage.hasNextPage).toBe(true);
    expect(firstPage.hasPreviousPage).toBe(false);

    const midPage = await repository.paginate({ page: 2, limit: 10 });
    expect(midPage.hasNextPage).toBe(true);
    expect(midPage.hasPreviousPage).toBe(true);

    const lastPage = await repository.paginate({ page: 3, limit: 10 });
    expect(lastPage.hasNextPage).toBe(false);
    expect(lastPage.hasPreviousPage).toBe(true);
    expect(spy).toHaveBeenCalled();
  });

  it('search() and searchPaginated() should use default fields if none provided', async () => {
    const findSpy = jest.spyOn(mockTypeOrmRepo, 'find').mockResolvedValue([]);
    const findAndCountSpy = jest.spyOn(mockTypeOrmRepo, 'findAndCount').mockResolvedValue([[], 0]);

    await repository.search('query');
    expect(findSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: [{ name: expect.anything() }],
      }),
    );

    await repository.searchPaginated('query', { page: 1, limit: 10 });
    expect(findAndCountSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: [{ name: expect.anything() }],
      }),
    );
  });

  it('createQueryBuilder() branch coverage for alias', () => {
    const mockQB = { where: jest.fn() };
    const spy = jest
      .spyOn(mockTypeOrmRepo, 'createQueryBuilder')
      .mockReturnValue(mockQB as unknown as never);

    repository.createQueryBuilder('custom');
    expect(spy).toHaveBeenCalledWith('custom');

    repository.createQueryBuilder();
    expect(spy).toHaveBeenCalledWith('mock_table');
  });
});
