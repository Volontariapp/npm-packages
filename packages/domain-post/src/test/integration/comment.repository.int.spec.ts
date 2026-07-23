import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { PostgresCommentRepository } from '../../repositories/postgres-comment.repository.js';
import { PostgresPostRepository } from '../../repositories/postgres-post.repository.js';
import { CommentModel } from '../../models/comment.model.js';
import { PostModel } from '../../models/post.model.js';
import { CommentFactory } from '../__test-utils__/factories/comment.factory.js';
import { PostFactory } from '../__test-utils__/factories/post.factory.js';
import { initializeTestDb, closeTestDb, truncateAll, getTestRepository } from '../data-source.js';
import { EventQueueModel } from '@volontariapp/database';
import { PostEventMessagingType } from '@volontariapp/messaging';
import type { Repository } from '@volontariapp/database';

describe('PostgresCommentRepository (Integration)', () => {
  let commentRepository: PostgresCommentRepository;
  let postRepository: PostgresPostRepository;
  let eventQueueRepo: Repository<EventQueueModel>;

  beforeAll(async () => {
    await initializeTestDb();
    commentRepository = new PostgresCommentRepository(getTestRepository(CommentModel));
    postRepository = new PostgresPostRepository(getTestRepository(PostModel));
    eventQueueRepo = getTestRepository(EventQueueModel);
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

  describe('createWithCommentCreated()', () => {
    it('should create a comment and emit COMMENT_CREATED event', async () => {
      const post = PostFactory.build();
      await postRepository.create(post);

      const comment = CommentFactory.build({ postId: post.id, content: 'Nice post!' });
      const created = await commentRepository.createWithCommentCreated(comment);

      expect(created.id).toBeDefined();
      expect(created.content).toBe('Nice post!');

      const events = await eventQueueRepo.find({
        where: { type: PostEventMessagingType.COMMENT_CREATED },
      });
      expect(events).toHaveLength(1);
      expect(events[0].payload).toEqual({
        after: {
          commentId: created.id,
          postId: created.postId,
          authorId: created.authorId,
        },
      });
      expect(events[0].emitterId).toEqual(created.authorId);
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

  describe('update()', () => {
    it('should update and return the comment', async () => {
      const post = PostFactory.build();
      await postRepository.create(post);

      const comment = CommentFactory.build({ postId: post.id });
      await commentRepository.create(comment);

      const updated = await commentRepository.update(comment.id, { content: 'Updated content' });
      expect(updated).not.toBeNull();
      expect(updated?.content).toBe('Updated content');
    });

    it('should return null when updating a non-existent comment', async () => {
      const result = await commentRepository.update('00000000-0000-0000-0000-000000000000', {
        content: 'Ghost',
      });
      expect(result).toBeNull();
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

  describe('deleteWithCommentDeleted()', () => {
    it('should delete comment and emit COMMENT_DELETED event', async () => {
      const post = PostFactory.build();
      await postRepository.create(post);

      const comment = CommentFactory.build({ postId: post.id });
      await commentRepository.create(comment);

      const result = await commentRepository.deleteWithCommentDeleted(comment.id);
      expect(result).toBe(true);

      const found = await commentRepository.findById(comment.id);
      expect(found).toBeNull();

      const events = await eventQueueRepo.find({
        where: { type: PostEventMessagingType.COMMENT_DELETED },
      });
      expect(events).toHaveLength(1);
      expect(events[0].payload).toEqual({
        after: {
          commentId: comment.id,
          postId: comment.postId,
        },
      });
      expect(events[0].emitterId).toEqual(comment.authorId);
    });

    it('should return false and not emit event if comment does not exist', async () => {
      const result = await commentRepository.deleteWithCommentDeleted(
        '00000000-0000-0000-0000-000000000000',
      );
      expect(result).toBe(false);

      const events = await eventQueueRepo.find();
      expect(events).toHaveLength(0);
    });
  });
});
