import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { randomUUID } from 'node:crypto';
import { PostgresPostRepository } from '../../repositories/postgres-post.repository.js';
import { PostgresCommentRepository } from '../../repositories/postgres-comment.repository.js';
import { PostService } from '../../services/post.service.js';
import { CommentService } from '../../services/comment.service.js';
import { PostModel, CommentModel } from '../../models/index.js';
import type { PostEntity } from '../../entities/post.entity.js';
import { initializeTestDb, closeTestDb, truncateAll, getTestRepository } from '../data-source.js';

describe('Domain Post & Comment Scenario (Integration)', () => {
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

  it('should execute a complete scenario: create post, retrieve, comment, paginate, and delete', async () => {
    const author1 = randomUUID();
    const author2 = randomUUID();

    // 1. Author 1 creates a post
    const postPayload: Partial<PostEntity> = {
      authorId: author1,
      title: 'Mon Super Scenario Post',
      content: 'Contenu du super post',
    };

    const createdPost = await postService.create(postPayload);
    expect(createdPost.id).toBeDefined();
    expect(createdPost.title).toBe('Mon Super Scenario Post');

    // 2. Author 2 retrieves posts and finds the new post
    const paginatedPosts = await postService.listPosts(1, 10);
    expect(paginatedPosts.total).toBe(1);
    expect(paginatedPosts.data[0].id).toBe(createdPost.id);

    // 3. Author 2 creates a comment on Author 1's post
    const comment1 = await commentService.create({
      postId: createdPost.id,
      authorId: author2,
      content: 'Super article !',
    });
    expect(comment1.id).toBeDefined();
    expect(comment1.content).toBe('Super article !');

    // 4. Author 1 replies to Author 2's comment (another comment on the same post)
    const comment2 = await commentService.create({
      postId: createdPost.id,
      authorId: author1,
      content: 'Merci beaucoup !',
    });
    expect(comment2.id).toBeDefined();

    // 5. Author 2 comments again
    const comment3 = await commentService.create({
      postId: createdPost.id,
      authorId: author2,
      content: "Tu comptes en écrire d'autres ?",
    });
    expect(comment3.id).toBeDefined();

    // 6. Test Pagination of Comments (total 3 comments)
    const commentsPage1 = await commentService.listPaginatedByPostId(createdPost.id, 1, 2);
    expect(commentsPage1.total).toBe(3);
    expect(commentsPage1.data).toHaveLength(2);

    const commentsPage2 = await commentService.listPaginatedByPostId(createdPost.id, 2, 2);
    expect(commentsPage2.total).toBe(3);
    expect(commentsPage2.data).toHaveLength(1);

    // 7. Test Error Case: Try to comment on a non-existent post
    const fakePostId = randomUUID();
    await expect(
      commentService.create({
        postId: fakePostId,
        authorId: author2,
        content: 'This should fail',
      }),
    ).rejects.toThrow(/not found/i); // From POST_NOT_FOUND

    // 8. Author 1 deletes their first reply (comment2)
    const deleteResult = await commentService.delete(comment2.id);
    expect(deleteResult).toBe(true);

    // Verify it was deleted
    const deletedComment = await commentService.findById(comment2.id);
    expect(deletedComment).toBeNull();

    // Re-check total comments
    const updatedComments = await commentService.listPaginatedByPostId(createdPost.id, 1, 10);
    expect(updatedComments.total).toBe(2);

    // 9. Author 1 deletes the entire post
    await postService.delete(createdPost.id);

    await expect(postService.findById(createdPost.id)).rejects.toThrow(/not found/i);
  });

  it('should test intensive pagination with many comments on a single post', async () => {
    const author1 = randomUUID();
    const commenter = randomUUID();

    // Create a Post
    const postPayload: Partial<PostEntity> = {
      authorId: author1,
      title: 'Post avec plein de commentaires',
      content: 'Test intensif',
    };
    const createdPost = await postService.create(postPayload);

    // Create 55 comments sequentially to preserve time order easily (or parallel but order might vary)
    // We will do parallel for speed, then test pagination correctness without strict order assumptions on same-ms,
    // though usually they will differ slightly.
    const createPromises = [];
    for (let i = 0; i < 55; i++) {
      createPromises.push(
        commentService.create({
          postId: createdPost.id,
          authorId: commenter,
          content: `Comment numéro ${String(i + 1)}`,
        }),
      );
    }
    await Promise.all(createPromises);

    // 1. First page (limit 10)
    const page1 = await commentService.listPaginatedByPostId(createdPost.id, 1, 10);
    expect(page1.total).toBe(55);
    expect(page1.data).toHaveLength(10);

    // 2. Middle page (page 3, limit 15) -> items 31 to 45
    const page3 = await commentService.listPaginatedByPostId(createdPost.id, 3, 15);
    expect(page3.total).toBe(55);
    expect(page3.data).toHaveLength(15);

    // 3. Last page (page 6, limit 10) -> items 51 to 55 (5 items)
    const page6 = await commentService.listPaginatedByPostId(createdPost.id, 6, 10);
    expect(page6.total).toBe(55);
    expect(page6.data).toHaveLength(5);

    // 4. Out of bounds page (page 10) -> 0 items
    const page10 = await commentService.listPaginatedByPostId(createdPost.id, 10, 10);
    expect(page10.total).toBe(55);
    expect(page10.data).toHaveLength(0);
  });
});
