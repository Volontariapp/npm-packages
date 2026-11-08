import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import type { Repository } from '@volontariapp/database';
import { PostgresPostRepository } from '../../repositories/postgres-post.repository.js';
import type { PostModel } from '../../models/post.model.js';
import { registerPostMappings } from '../../models/mapper.js';
import {
  createChainableQueryBuilderMock,
  createPaginationTypeOrmRepositoryMock,
} from '../__test-utils__/mocks/pagination-typeorm.mock.js';

describe('listPaginated: total des posts', () => {
  let postRepo: jest.Mocked<Repository<PostModel>>;
  let posts: PostgresPostRepository;

  beforeEach(() => {
    registerPostMappings();
    postRepo = createPaginationTypeOrmRepositoryMock<PostModel>('PostModel');
    posts = new PostgresPostRepository(postRepo);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('prend le total du comptage, pas du nombre de lignes de la page', async () => {
    const qb = createChainableQueryBuilderMock<PostModel>();
    // Une page vide mais 25 posts au total : le total ne peut venir que du comptage
    qb.getMany.mockResolvedValue([]);
    qb.getRawOne.mockResolvedValue({ total: '25' });
    jest.spyOn(postRepo, 'createQueryBuilder').mockReturnValue(qb.builder);

    const result = await posts.listPaginated(1, 10, undefined, 'reader');

    expect(result.total).toBe(25);
    expect(result.totalPages).toBe(3);
    expect(result.hasNextPage).toBe(true);
    expect(result.hasPreviousPage).toBe(false);
  });

  it('indique la derniere page quand le total est atteint', async () => {
    const qb = createChainableQueryBuilderMock<PostModel>();
    qb.getRawOne.mockResolvedValue({ total: '25' });
    jest.spyOn(postRepo, 'createQueryBuilder').mockReturnValue(qb.builder);

    const result = await posts.listPaginated(3, 10, undefined, 'reader');

    expect(result.page).toBe(3);
    expect(result.hasNextPage).toBe(false);
    expect(result.hasPreviousPage).toBe(true);
  });

  it('vaut zero quand le comptage ne renvoie rien', async () => {
    const qb = createChainableQueryBuilderMock<PostModel>();
    qb.getRawOne.mockResolvedValue(undefined);
    jest.spyOn(postRepo, 'createQueryBuilder').mockReturnValue(qb.builder);

    const result = await posts.listPaginated(1, 10);

    expect(result.total).toBe(0);
    expect(result.totalPages).toBe(0);
    expect(result.hasNextPage).toBe(false);
  });
});
