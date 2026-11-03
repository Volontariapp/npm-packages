import { jest, describe, it, expect, beforeEach, afterEach, beforeAll } from '@jest/globals';
import type { Repository } from 'typeorm';
import { BaseRepository, DEFAULT_PAGE_LIMIT, MAX_PAGE_LIMIT } from '../../core/base.repository.js';
import { databaseMapper } from '../../core/mapper.service.js';
import {
  createTypeOrmRepositoryMock,
  PaginationTestEntity,
  PaginationTestModelClass,
} from './typeorm-repository.mock.js';
import type { PaginationTestModel } from './typeorm-repository.mock.js';

class PaginationTestRepository extends BaseRepository<PaginationTestModel, PaginationTestEntity> {}

describe('BaseRepository.paginate (bornes et ordre)', () => {
  let typeOrmRepo: jest.Mocked<Repository<PaginationTestModel>>;
  let repository: PaginationTestRepository;

  beforeAll(() => {
    databaseMapper.registerBidirectional(PaginationTestModelClass, PaginationTestEntity);
  });

  beforeEach(() => {
    typeOrmRepo = createTypeOrmRepositoryMock([{ propertyName: 'id' }]);
    jest.spyOn(typeOrmRepo, 'findAndCount').mockResolvedValue([[], 0]);
    repository = new PaginationTestRepository(
      typeOrmRepo,
      PaginationTestEntity,
      PaginationTestModelClass,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('ramene une page < 1 a 1 (offset jamais negatif)', async () => {
    const result = await repository.paginate({ page: -3, limit: 10 });
    expect(result.page).toBe(1);
    expect(typeOrmRepo.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0, take: 10 }),
    );
  });

  it('ramene une page NaN a 1', async () => {
    const result = await repository.paginate({ page: Number.NaN, limit: 10 });
    expect(result.page).toBe(1);
  });

  it('ramene un limit < 1 a la valeur par defaut (totalPages fini)', async () => {
    jest.spyOn(typeOrmRepo, 'findAndCount').mockResolvedValue([[], 25]);
    const result = await repository.paginate({ page: 1, limit: 0 });
    expect(result.limit).toBe(DEFAULT_PAGE_LIMIT);
    expect(result.totalPages).toBe(3);
    expect(Number.isFinite(result.totalPages)).toBe(true);
  });

  it('plafonne limit a MAX_PAGE_LIMIT', async () => {
    const result = await repository.paginate({ page: 2, limit: 50000 });
    expect(result.limit).toBe(MAX_PAGE_LIMIT);
    expect(MAX_PAGE_LIMIT).toBe(1000);
    expect(typeOrmRepo.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({ skip: MAX_PAGE_LIMIT, take: MAX_PAGE_LIMIT }),
    );
  });

  it('applique un ordre par cle primaire quand aucun order n est fourni', async () => {
    await repository.paginate({ page: 1, limit: 10 });
    expect(typeOrmRepo.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({ order: { id: 'ASC' } }),
    );
  });

  it('applique aussi l ordre primaire quand order est un objet vide', async () => {
    await repository.paginate({ page: 1, limit: 10 }, { order: {} });
    expect(typeOrmRepo.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({ order: { id: 'ASC' } }),
    );
  });

  it('conserve l ordre fourni par l appelant', async () => {
    await repository.paginate({ page: 1, limit: 10 }, { order: { name: 'DESC' } });
    expect(typeOrmRepo.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({ order: { name: 'DESC' } }),
    );
  });

  it('ordonne sur toutes les colonnes d une cle composite', async () => {
    const compositeRepo = createTypeOrmRepositoryMock([
      { propertyName: 'id' },
      { propertyName: 'name' },
    ]);
    jest.spyOn(compositeRepo, 'findAndCount').mockResolvedValue([[], 0]);
    const composite = new PaginationTestRepository(
      compositeRepo,
      PaginationTestEntity,
      PaginationTestModelClass,
    );
    await composite.paginate({ page: 1, limit: 10 });
    expect(compositeRepo.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({ order: { id: 'ASC', name: 'ASC' } }),
    );
  });

  it('n impose aucun ordre pour une entite sans cle primaire', async () => {
    const noPkRepo = createTypeOrmRepositoryMock([]);
    jest.spyOn(noPkRepo, 'findAndCount').mockResolvedValue([[], 0]);
    const noPk = new PaginationTestRepository(
      noPkRepo,
      PaginationTestEntity,
      PaginationTestModelClass,
    );
    await noPk.paginate({ page: 1, limit: 10 });
    const call = noPkRepo.findAndCount.mock.calls[0]?.[0];
    expect(call).toBeDefined();
    expect(call).not.toHaveProperty('order');
  });

  it('searchPaginated herite des bornes et de l ordre', async () => {
    await repository.searchPaginated('x', { page: 0, limit: 99999 }, ['name']);
    expect(typeOrmRepo.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0, take: MAX_PAGE_LIMIT, order: { id: 'ASC' } }),
    );
  });
});
