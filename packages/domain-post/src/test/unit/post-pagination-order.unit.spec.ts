import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import type { Repository } from '@volontariapp/database';
import { PostgresPostRepository } from '../../repositories/postgres-post.repository.js';
import { PostgresCommentRepository } from '../../repositories/postgres-comment.repository.js';
import type { PostModel } from '../../models/post.model.js';
import type { CommentModel } from '../../models/comment.model.js';
import { registerPostMappings } from '../../models/mapper.js';
import {
  createChainableQueryBuilderMock,
  createPaginationTypeOrmRepositoryMock,
} from '../__test-utils__/mocks/pagination-typeorm.mock.js';

describe('Pagination: ordre deterministe (posts et commentaires)', () => {
  let postRepo: jest.Mocked<Repository<PostModel>>;
  let commentRepo: jest.Mocked<Repository<CommentModel>>;
  let posts: PostgresPostRepository;
  let comments: PostgresCommentRepository;

  beforeEach(() => {
    registerPostMappings();
    postRepo = createPaginationTypeOrmRepositoryMock<PostModel>('PostModel');
    commentRepo = createPaginationTypeOrmRepositoryMock<CommentModel>('CommentModel');
    posts = new PostgresPostRepository(postRepo);
    comments = new PostgresCommentRepository(commentRepo);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('listPaginated auteur=lecteur passe un ordre createdAt DESC puis id DESC', async () => {
    const spy = jest.spyOn(postRepo, 'findAndCount').mockResolvedValue([[], 0]);

    await posts.listPaginated(1, 10, 'u1', 'u1');

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ order: { createdAt: 'DESC', id: 'DESC' } }),
    );
  });

  it('listPaginated general trie createdAt DESC puis id DESC', async () => {
    const qb = createChainableQueryBuilderMock<PostModel>();
    jest.spyOn(postRepo, 'createQueryBuilder').mockReturnValue(qb.builder);

    await posts.listPaginated(1, 10, undefined, 'reader');

    expect(qb.orderBy).toHaveBeenCalledWith('post.createdAt', 'DESC');
    expect(qb.addOrderBy).toHaveBeenCalledWith('post.id', 'DESC');
  });

  it('listPaginatedByPostId trie createdAt DESC puis id DESC', async () => {
    const spy = jest.spyOn(commentRepo, 'findAndCount').mockResolvedValue([[], 0]);

    await comments.listPaginatedByPostId('p1', 1, 10);

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { postId: 'p1' },
        order: { createdAt: 'DESC', id: 'DESC' },
      }),
    );
  });
});
