import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { randomUUID } from 'node:crypto';
import { PostgresPostRepository } from '../../repositories/postgres-post.repository.js';
import { PostgresCommentRepository } from '../../repositories/postgres-comment.repository.js';
import { PostService } from '../../services/post.service.js';
import { CommentService } from '../../services/comment.service.js';
import { UserRoles } from '@volontariapp/shared';
import { PostModel, CommentModel } from '../../models/index.js';
import { initializeTestDb, closeTestDb, truncateAll, getTestRepository } from '../data-source.js';

describe('Domain Post & Comment Authorization (Integration)', () => {
  let postService: PostService;
  let commentService: CommentService;
  let postRepository: PostgresPostRepository;
  let commentRepository: PostgresCommentRepository;

  beforeAll(async () => {
    await initializeTestDb();
    postRepository = new PostgresPostRepository(getTestRepository(PostModel));
    commentRepository = new PostgresCommentRepository(getTestRepository(CommentModel));

    postService = new PostService(postRepository);
    commentService = new CommentService(commentRepository, postRepository);
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await truncateAll();
  });

  it('should prevent user from updating or deleting a post they do not own', async () => {
    const authorId = randomUUID();
    const otherUserId = randomUUID();

    // 1. Create a post
    const post = await postService.create({
      authorId,
      title: 'Auth Test Post',
      content: 'Auth test content',
    });

    // 2. Try to update the post with another user's ID
    await expect(
      postService.update(post.id, { content: 'hacked content' }, otherUserId, UserRoles.VOLUNTEER),
    ).rejects.toThrow(/You are not the author of this post/i);

    // 3. Admin can update
    await expect(
      postService.update(post.id, { content: 'admin update' }, otherUserId, UserRoles.ADMIN),
    ).resolves.toBeDefined();

    // 4. Try to delete the post with another user's ID
    await expect(postService.delete(post.id, otherUserId, UserRoles.VOLUNTEER)).rejects.toThrow(
      /You are not the author of this post/i,
    );

    // 5. Author can delete
    await expect(
      postService.delete(post.id, authorId, UserRoles.VOLUNTEER),
    ).resolves.toBeUndefined();
  });

  it('should prevent user from deleting a comment they do not own', async () => {
    const authorId = randomUUID();
    const commenterId = randomUUID();
    const otherUserId = randomUUID();

    const post = await postService.create({
      authorId,
      title: 'Auth Test Post',
      content: 'Auth test content',
    });

    const comment = await commentService.create({
      postId: post.id,
      authorId: commenterId,
      content: 'Auth test comment',
    });

    // Try to delete comment with another user
    await expect(
      commentService.delete(comment.id, otherUserId, UserRoles.VOLUNTEER),
    ).rejects.toThrow(/You are not the author of this comment/i);

    // Admin can delete
    await expect(commentService.delete(comment.id, otherUserId, UserRoles.ADMIN)).resolves.toBe(
      true,
    );
  });
});
