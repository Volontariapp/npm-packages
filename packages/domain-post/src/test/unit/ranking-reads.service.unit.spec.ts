import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { createMock } from '@volontariapp/testing';
import { PostService } from '../../services/post.service.js';
import { CommentService } from '../../services/comment.service.js';
import type { ICommentRepository, IPostRepository } from '../../repositories/interfaces/index.js';
import { PostFactory } from '../__test-utils__/factories/post.factory.js';
import { CommentFactory } from '../__test-utils__/factories/comment.factory.js';

describe('Ranking reads (Unit)', () => {
  let postRepository: jest.Mocked<IPostRepository>;
  let commentRepository: jest.Mocked<ICommentRepository>;
  let postService: PostService;
  let commentService: CommentService;

  beforeEach(() => {
    postRepository = createMock<IPostRepository>();
    commentRepository = createMock<ICommentRepository>();
    postService = new PostService(postRepository);
    commentService = new CommentService(commentRepository, postRepository);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should delegate listRecentByAuthors to the repository', async () => {
    const posts = PostFactory.buildMany(2);
    const spy = jest.spyOn(postRepository, 'listRecentByAuthors').mockResolvedValue(posts);
    const options = { authorIds: ['a'], perAuthorLimit: 5, limit: 300 };

    await expect(postService.listRecentByAuthors(options)).resolves.toBe(posts);
    expect(spy).toHaveBeenCalledWith(options);
  });

  it('should wrap a repository failure of listRecentByAuthors', async () => {
    jest.spyOn(postRepository, 'listRecentByAuthors').mockRejectedValue(new Error('boom'));

    await expect(postService.listRecentByAuthors({ authorIds: ['a'] })).rejects.toThrow();
  });

  it('should delegate listByIds to the repository', async () => {
    const posts = PostFactory.buildMany(1);
    const spy = jest.spyOn(postRepository, 'listByIds').mockResolvedValue(posts);

    await expect(postService.listByIds(['p1'])).resolves.toBe(posts);
    expect(spy).toHaveBeenCalledWith(['p1']);
  });

  it('should delegate listByAuthor of the comments to the repository', async () => {
    const comment = CommentFactory.build();
    const since = new Date('2026-10-01T00:00:00Z');
    const spy = jest.spyOn(commentRepository, 'listByAuthor').mockResolvedValue([comment]);

    await expect(commentService.listByAuthor('author-1', since, 50)).resolves.toEqual([comment]);
    expect(spy).toHaveBeenCalledWith('author-1', since, 50);
  });

  it('should wrap a repository failure of listByAuthor', async () => {
    jest.spyOn(commentRepository, 'listByAuthor').mockRejectedValue(new Error('boom'));

    await expect(commentService.listByAuthor('author-1')).rejects.toThrow();
  });
});
