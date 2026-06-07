import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { PostgresPostRepository } from '../../repositories/postgres-post.repository.js';
import { PostModel } from '../../models/post.model.js';
import { PostFactory } from '../__test-utils__/factories/post.factory.js';
import { initializeTestDb, closeTestDb, truncateAll, getTestRepository } from '../data-source.js';

describe('PostgresPostRepository (Integration)', () => {
  let repository: PostgresPostRepository;

  beforeAll(async () => {
    await initializeTestDb();
    const typeOrmRepo = getTestRepository(PostModel);
    repository = new PostgresPostRepository(typeOrmRepo);
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await truncateAll();
  });

  // ─── findById ─────────────────────────────────────────────────────────────

  describe('findById()', () => {
    it('should return a post by id', async () => {
      // Arrange
      const post = PostFactory.build({ title: 'Test Post' });
      await repository.create(post);

      // Act
      const result = await repository.findById(post.id);

      // Assert
      expect(result).toBeDefined();
      expect(result?.title).toBe('Test Post');
      expect(result?.id).toBe(post.id);
    });

    it('should return null if post does not exist', async () => {
      // Act
      const result = await repository.findById('00000000-0000-0000-0000-000000000000');

      // Assert
      expect(result).toBeNull();
    });
  });

  // ─── findByAuthorId ───────────────────────────────────────────────────────

  describe('findByAuthorId()', () => {
    it('should return all posts for a specific author', async () => {
      // Arrange
      const authorId = '00000000-0000-0000-0000-000000000001';
      const posts = PostFactory.buildMany(3, { authorId });
      for (const post of posts) {
        await repository.create(post);
      }
      await repository.create(
        PostFactory.build({ authorId: '00000000-0000-0000-0000-000000000002' }),
      );

      // Act
      const result = await repository.findByAuthorId(authorId);

      // Assert
      expect(result).toHaveLength(3);
      result.forEach((p) => {
        expect(p.authorId).toBe(authorId);
      });
    });

    it('should return an empty array if author has no posts', async () => {
      // Act
      const result = await repository.findByAuthorId('00000000-0000-0000-0000-000000000003');

      // Assert
      expect(result).toEqual([]);
    });
  });

  // ─── findAll ──────────────────────────────────────────────────────────────

  describe('findAll()', () => {
    it('should return all posts in the database', async () => {
      // Arrange
      await repository.create(PostFactory.build({ title: 'Post 1' }));
      await repository.create(PostFactory.build({ title: 'Post 2' }));

      // Act
      const result = await repository.findAll();

      // Assert
      expect(result).toHaveLength(2);
      const titles = result.map((p) => p.title);
      expect(titles).toContain('Post 1');
      expect(titles).toContain('Post 2');
    });
  });

  // ─── create ───────────────────────────────────────────────────────────────

  describe('create()', () => {
    it('should persist a new post and return it', async () => {
      // Arrange
      const postData = PostFactory.build({ title: 'Persisted Post' });

      // Act
      const result = await repository.create(postData);

      // Assert
      expect(result.id).toBeDefined();
      expect(result.title).toBe('Persisted Post');

      const found = await repository.findById(result.id);
      expect(found).toBeDefined();
      expect(found?.title).toBe('Persisted Post');
    });

    it('should throw an error when creating a post with a duplicate title', async () => {
      // Arrange
      const post1 = PostFactory.build({ title: 'Unique Title' });
      const post2 = PostFactory.build({ title: 'Unique Title' });
      await repository.create(post1);

      // Act & Assert
      await expect(repository.create(post2)).rejects.toThrow();
    });
  });

  // ─── update ───────────────────────────────────────────────────────────────

  describe('update()', () => {
    it('should update an existing post', async () => {
      // Arrange
      const post = await repository.create(PostFactory.build({ title: 'Old Title' }));
      const updateData = { title: 'New Title' };

      // Act
      const result = await repository.update(post.id, updateData);

      // Assert
      expect(result?.title).toBe('New Title');

      const found = await repository.findById(post.id);
      expect(found?.title).toBe('New Title');
    });

    it('should return null when updating a non-existent post', async () => {
      // Act
      const result = await repository.update('00000000-0000-0000-0000-000000000000', {
        title: 'New',
      });

      // Assert
      expect(result).toBeNull();
    });
  });

  // ─── delete ───────────────────────────────────────────────────────────────

  describe('delete()', () => {
    it('should delete a post and return true', async () => {
      // Arrange
      const post = await repository.create(PostFactory.build());

      // Act
      const result = await repository.delete(post.id);

      // Assert
      expect(result).toBe(true);
      const found = await repository.findById(post.id);
      expect(found).toBeNull();
    });

    it('should return false when deleting a non-existent post', async () => {
      // Act
      const result = await repository.delete('00000000-0000-0000-0000-000000000000');

      // Assert
      expect(result).toBe(false);
    });
  });

  // ─── search ───────────────────────────────────────────────────────────────

  describe('search()', () => {
    it('should find posts with matching title (case-insensitive)', async () => {
      // Arrange
      await repository.create(PostFactory.build({ title: 'Hello World' }));
      await repository.create(PostFactory.build({ title: 'HELLO GALAXY' }));
      await repository.create(PostFactory.build({ title: 'Goodbye' }));

      // Act
      const result = await repository.search('hello');

      // Assert
      expect(result).toHaveLength(2);
      const titles = result.map((p) => p.title.toUpperCase());
      expect(titles).toContain('HELLO WORLD');
      expect(titles).toContain('HELLO GALAXY');
    });

    it('should return an empty array if no match found', async () => {
      // Act
      const result = await repository.search('nonexistent');

      // Assert
      expect(result).toEqual([]);
    });
  });

  // ─── deleteByAuthorId ─────────────────────────────────────────────────────

  describe('deleteByAuthorId()', () => {
    it('should delete all posts from an author and return affected count', async () => {
      // Arrange
      const authorId = '00000000-0000-0000-0000-000000000002';
      await repository.create(PostFactory.build({ authorId }));
      await repository.create(PostFactory.build({ authorId }));
      await repository.create(
        PostFactory.build({
          authorId: '00000000-0000-0000-0000-000000000099',
        }),
      );
      // Act
      const affected = await repository.deleteByAuthorId(authorId);
      const remainingForAuthor = await repository.findByAuthorId(authorId);
      const allPosts = await repository.findAll();

      // Assert
      expect(affected).toBe(2);
      expect(remainingForAuthor).toHaveLength(0);
      expect(allPosts).toHaveLength(1);
    });

    it('should return 0 if author has no posts to delete', async () => {
      // Act
      const result = await repository.deleteByAuthorId('00000000-0000-0000-0000-000000000123');
      // Assert
      expect(result).toBe(0);
    });
  });
  // ─── listPaginated ────────────────────────────────────────────────────────

  describe('listPaginated()', () => {
    it('should paginate posts correctly', async () => {
      // Arrange
      for (let i = 0; i < 15; i++) {
        await repository.create(PostFactory.build({ title: `Paginated Post ${String(i)}` }));
      }

      // Act
      const resultPage1 = await repository.listPaginated(1, 10);
      const resultPage2 = await repository.listPaginated(2, 10);

      // Assert
      expect(resultPage1.data).toHaveLength(10);
      expect(resultPage1.total).toBe(15);
      expect(resultPage1.page).toBe(1);
      expect(resultPage1.limit).toBe(10);
      expect(resultPage1.totalPages).toBe(2);
      expect(resultPage1.hasNextPage).toBe(true);

      expect(resultPage2.data).toHaveLength(5);
      expect(resultPage2.page).toBe(2);
      expect(resultPage2.hasNextPage).toBe(false);
    });

    it('should filter paginated posts by authorId', async () => {
      // Arrange
      const authorId = '00000000-0000-0000-0000-000000000088';
      await repository.create(PostFactory.build({ title: 'A', authorId }));
      await repository.create(PostFactory.build({ title: 'B', authorId }));
      await repository.create(
        PostFactory.build({ title: 'C', authorId: '00000000-0000-0000-0000-000000000099' }),
      );

      // Act
      const result = await repository.listPaginated(1, 10, authorId);

      // Assert
      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
      result.data.forEach((p) => {
        expect(p.authorId).toBe(authorId);
      });
    });
  });
});
