import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { randomUUID } from 'node:crypto';
import { PostgresPostRepository } from '../../repositories/postgres-post.repository.js';
import { PostgresCommentRepository } from '../../repositories/postgres-comment.repository.js';
import { PostModel, CommentModel } from '../../models/index.js';
import { MAX_POSTS_BY_IDS } from '../../constants/index.js';
import {
  initializeTestDb,
  closeTestDb,
  truncateAll,
  getTestRepository,
  testDataSource,
} from '../data-source.js';

const insertPost = async (
  authorId: string,
  minutesAgo: number,
  mediaStatus = 'NONE',
): Promise<string> => {
  const id = randomUUID();
  await testDataSource.query(
    `INSERT INTO posts (id, "authorId", title, content, "createdAt", "updatedAt", media_status)
     VALUES ($1, $2, $3, 'content', now() - ($4 || ' minutes')::interval, now(), $5)`,
    [id, authorId, `title ${id}`, String(minutesAgo), mediaStatus],
  );
  return id;
};

const insertComment = async (authorId: string, minutesAgo: number): Promise<string> => {
  const id = randomUUID();
  await testDataSource.query(
    `INSERT INTO comments (id, "postId", "authorId", content, "createdAt", "updatedAt")
     VALUES ($1, $2, $3, 'comment', now() - ($4 || ' minutes')::interval, now())`,
    [id, randomUUID(), authorId, String(minutesAgo)],
  );
  return id;
};

describe('Ranking reads (Integration)', () => {
  let postRepository: PostgresPostRepository;
  let commentRepository: PostgresCommentRepository;

  beforeAll(async () => {
    await initializeTestDb();
    postRepository = new PostgresPostRepository(getTestRepository(PostModel));
    commentRepository = new PostgresCommentRepository(getTestRepository(CommentModel));
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await truncateAll();
  });

  describe('listRecentByAuthors', () => {
    it('should cap each author before the global cap and sort newest first', async () => {
      const prolific = randomUUID();
      const quiet = randomUUID();
      const prolificIds = await Promise.all([1, 2, 3, 4, 5, 6, 7].map((m) => insertPost(prolific, m)));
      const quietIds = await Promise.all([10, 20].map((m) => insertPost(quiet, m)));

      const posts = await postRepository.listRecentByAuthors({
        authorIds: [prolific, quiet],
        perAuthorLimit: 3,
        limit: 100,
      });

      expect(posts.map((p) => p.id)).toEqual([
        prolificIds[0],
        prolificIds[1],
        prolificIds[2],
        quietIds[0],
        quietIds[1],
      ]);
    });

    it('should apply the global cap after the per-author cap', async () => {
      const authorA = randomUUID();
      const authorB = randomUUID();
      const a = await Promise.all([1, 2, 3].map((m) => insertPost(authorA, m)));
      await Promise.all([4, 5, 6].map((m) => insertPost(authorB, m)));

      const posts = await postRepository.listRecentByAuthors({
        authorIds: [authorA, authorB],
        perAuthorLimit: 2,
        limit: 3,
      });

      expect(posts).toHaveLength(3);
      expect(posts.slice(0, 2).map((p) => p.id)).toEqual([a[0], a[1]]);
    });

    it('should ignore authorIds when allAuthors is true', async () => {
      await insertPost(randomUUID(), 1);
      await insertPost(randomUUID(), 2);

      const posts = await postRepository.listRecentByAuthors({ authorIds: [], allAuthors: true });

      expect(posts).toHaveLength(2);
    });

    it('should return nothing without authors when allAuthors is false', async () => {
      await insertPost(randomUUID(), 1);

      await expect(postRepository.listRecentByAuthors({ authorIds: [] })).resolves.toEqual([]);
      await expect(
        postRepository.listRecentByAuthors({ authorIds: ['not-a-uuid'] }),
      ).resolves.toEqual([]);
    });

    it('should keep only the posts created since the given date', async () => {
      const author = randomUUID();
      const recent = await insertPost(author, 5);
      await insertPost(author, 600);

      const posts = await postRepository.listRecentByAuthors({
        authorIds: [author],
        since: new Date(Date.now() - 60 * 60 * 1000),
      });

      expect(posts.map((p) => p.id)).toEqual([recent]);
    });

    it('should hide the posts whose media is not ready', async () => {
      const author = randomUUID();
      const visible = await insertPost(author, 1, 'READY');
      await insertPost(author, 2, 'PENDING');
      await insertPost(author, 3, 'REJECTED');

      const posts = await postRepository.listRecentByAuthors({ authorIds: [author] });

      expect(posts.map((p) => p.id)).toEqual([visible]);
    });
  });

  describe('listByIds', () => {
    it('should ignore absent, malformed and hidden ids', async () => {
      const author = randomUUID();
      const first = await insertPost(author, 1);
      const second = await insertPost(author, 2);
      const hidden = await insertPost(author, 3, 'PENDING');

      const posts = await postRepository.listByIds([
        second,
        first,
        hidden,
        randomUUID(),
        'not-a-uuid',
      ]);

      expect(posts.map((p) => p.id)).toEqual([first, second]);
    });

    it('should read at most the cap of ids', async () => {
      const author = randomUUID();
      const ids = await Promise.all(
        Array.from({ length: MAX_POSTS_BY_IDS + 5 }, (_, i) => insertPost(author, i)),
      );

      const posts = await postRepository.listByIds(ids);

      expect(posts).toHaveLength(MAX_POSTS_BY_IDS);
    });
  });

  describe('listByAuthor (comments)', () => {
    it('should list the comments of the author newest first and honour since and limit', async () => {
      const author = randomUUID();
      const newest = await insertComment(author, 1);
      const middle = await insertComment(author, 30);
      await insertComment(author, 6000);
      await insertComment(randomUUID(), 1);

      const all = await commentRepository.listByAuthor(author);
      const since = await commentRepository.listByAuthor(
        author,
        new Date(Date.now() - 24 * 60 * 60 * 1000),
      );
      const limited = await commentRepository.listByAuthor(author, undefined, 1);

      expect(all).toHaveLength(3);
      expect(since.map((c) => c.id)).toEqual([newest, middle]);
      expect(limited.map((c) => c.id)).toEqual([newest]);
    });
  });
});
