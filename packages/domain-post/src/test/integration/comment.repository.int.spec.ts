import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { PostgresCommentRepository } from '../../repositories/postgres-comment.repository.js';
import { PostgresPostRepository } from '../../repositories/postgres-post.repository.js';
import { CommentModel } from '../../models/comment.model.js';
import { PostModel } from '../../models/post.model.js';
import { CommentFactory } from '../__test-utils__/factories/comment.factory.js';
import { PostFactory } from '../__test-utils__/factories/post.factory.js';
import { initializeTestDb, closeTestDb, truncateAll, getTestRepository } from '../data-source.js';

describe('PostgresCommentRepository (Integration)', () => {
  let commentRepository: PostgresCommentRepository;
  let postRepository: PostgresPostRepository;

  beforeAll(async () => {
    await initializeTestDb();
    commentRepository = new PostgresCommentRepository(getTestRepository(CommentModel));
    postRepository = new PostgresPostRepository(getTestRepository(PostModel));
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await truncateAll();
  });

  describe('create()', () => {
    it('should create a comment successfully', async () => {
      const post = PostFactory.build();
      await postRepository.create(post);

      const comment = CommentFactory.build({ postId: post.id, content: 'Nice post!' });
      const created = await commentRepository.create(comment);

      expect(created.id).toBeDefined();
      expect(created.content).toBe('Nice post!');
      expect(created.postId).toBe(post.id);
    });

    it('should throw if creating a comment with missing required fields', async () => {
      const comment = CommentFactory.build();
      comment.content = null as unknown as string;
      await expect(commentRepository.create(comment)).rejects.toThrow();
    });
  });

  describe('findById()', () => {
    it('should return null when comment does not exist', async () => {
      const result = await commentRepository.findById('00000000-0000-0000-0000-000000000000');
      expect(result).toBeNull();
    });

    it('should return the comment when it exists', async () => {
      const post = PostFactory.build();
      await postRepository.create(post);

      const comment = CommentFactory.build({ postId: post.id });
      await commentRepository.create(comment);

      const found = await commentRepository.findById(comment.id);
      expect(found).toBeDefined();
      expect(found?.id).toBe(comment.id);
    });
  });

  describe('listPaginatedByPostId()', () => {
    it('should return empty list when post has no comments', async () => {
      const result = await commentRepository.listPaginatedByPostId(
        '00000000-0000-0000-0000-000000000000',
        1,
        10,
      );
      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('should paginate comments correctly', async () => {
      const post = PostFactory.build();
      await postRepository.create(post);

      for (let i = 0; i < 5; i++) {
        await commentRepository.create(CommentFactory.build({ postId: post.id }));
      }

      const page1 = await commentRepository.listPaginatedByPostId(post.id, 1, 2);
      expect(page1.total).toBe(5);
      expect(page1.data).toHaveLength(2);

      const page2 = await commentRepository.listPaginatedByPostId(post.id, 2, 2);
      expect(page2.data).toHaveLength(2);

      const page3 = await commentRepository.listPaginatedByPostId(post.id, 3, 2);
      expect(page3.data).toHaveLength(1);
    });
  });

  describe('delete()', () => {
    it('should return false when deleting non-existent comment', async () => {
      const result = await commentRepository.delete('00000000-0000-0000-0000-000000000000');
      expect(result).toBe(false);
    });

    it('should return true and delete comment when it exists', async () => {
      const post = PostFactory.build();
      await postRepository.create(post);

      const comment = CommentFactory.build({ postId: post.id });
      await commentRepository.create(comment);

      const result = await commentRepository.delete(comment.id);
      expect(result).toBe(true);

      const found = await commentRepository.findById(comment.id);
      expect(found).toBeNull();
    });
  });
});
