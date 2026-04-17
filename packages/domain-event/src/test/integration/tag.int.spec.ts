import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { initializeTestDb, closeTestDb, truncateAll, getTestRepository } from '../data-source.js';
import { TagModel } from '../../models/tag.model.js';
import { PostgresTagRepository } from '../../repositories/postgres-tag.repository.js';
import { TagEntity } from '../../entities/tag.entity.js';
import { TagFactory } from '../__test-utils__/factories/tag.factory.js';

describe('PostgresTagRepository (Integration)', () => {
  let repository: PostgresTagRepository;

  beforeAll(async () => {
    await initializeTestDb();
    repository = new PostgresTagRepository(getTestRepository(TagModel));
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await truncateAll();
  });

  // ─── create ───────────────────────────────────────────────────────────────

  describe('create()', () => {
    it('should persist a tag and return a mapped TagEntity', async () => {
      // Arrange
      const input = TagFactory.buildInput();

      // Act
      const result = await repository.create(input);

      // Assert
      expect(result).toBeInstanceOf(TagEntity);
      expect(result.id).toBeDefined();
      expect(result.name).toBe(input.name);
      expect(result.slug).toBe(input.slug);
      expect(result.balise).toBe(input.balise);
    });

    it('should generate a UUID for the id automatically', async () => {
      // Arrange
      const input = TagFactory.buildInput();

      // Act
      const result = await repository.create(input);

      // Assert
      expect(result.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    });
  });

  // ─── findById ─────────────────────────────────────────────────────────────

  describe('findById()', () => {
    it('should return the tag when it exists', async () => {
      // Arrange
      const created = await repository.create(TagFactory.buildInput());

      // Act
      const result = await repository.findById(created.id);

      // Assert
      expect(result).not.toBeNull();
      expect(result?.id).toBe(created.id);
      expect(result?.slug).toBe(created.slug);
    });

    it('should return null when the tag does not exist', async () => {
      // Act
      const result = await repository.findById('00000000-0000-0000-0000-000000000000');

      // Assert
      expect(result).toBeNull();
    });
  });

  // ─── findBySlug ───────────────────────────────────────────────────────────

  describe('findBySlug()', () => {
    it('should return the tag matching the given slug', async () => {
      // Arrange
      const input = TagFactory.buildInput({ slug: 'unique-slug-test' });
      await repository.create(input);

      // Act
      const result = await repository.findBySlug('unique-slug-test');

      // Assert
      expect(result).not.toBeNull();
      expect(result?.slug).toBe('unique-slug-test');
    });

    it('should return null when no tag has that slug', async () => {
      // Act
      const result = await repository.findBySlug('not-existing-slug');

      // Assert
      expect(result).toBeNull();
    });
  });

  // ─── findAll ──────────────────────────────────────────────────────────────

  describe('findAll()', () => {
    it('should return all persisted tags', async () => {
      // Arrange
      await repository.create(TagFactory.buildInput());
      await repository.create(TagFactory.buildInput());
      await repository.create(TagFactory.buildInput());

      // Act
      const result = await repository.findAll();

      // Assert
      expect(result).toHaveLength(3);
      expect(result[0]).toBeInstanceOf(TagEntity);
    });

    it('should return an empty array when no tags are persisted', async () => {
      // Act
      const result = await repository.findAll();

      // Assert
      expect(result).toHaveLength(0);
    });
  });

  // ─── findByIds ────────────────────────────────────────────────────────────

  describe('findByIds()', () => {
    it('should return only the tags matching the given ids', async () => {
      // Arrange
      const t1 = await repository.create(TagFactory.buildInput());
      const t2 = await repository.create(TagFactory.buildInput());
      await repository.create(TagFactory.buildInput()); // should not be returned

      // Act
      const result = await repository.findByIds([t1.id, t2.id]);

      // Assert
      expect(result).toHaveLength(2);
      const ids = result.map((t) => t.id);
      expect(ids).toContain(t1.id);
      expect(ids).toContain(t2.id);
    });

    it('should return an empty array when none of the ids exist', async () => {
      // Act
      const result = await repository.findByIds(['00000000-0000-0000-0000-000000000001']);

      // Assert
      expect(result).toHaveLength(0);
    });
  });

  // ─── update ───────────────────────────────────────────────────────────────

  describe('update()', () => {
    it('should update the tag fields and return the updated entity', async () => {
      // Arrange
      const original = await repository.create(TagFactory.buildInput({ name: 'Original Name' }));

      // Act
      const updated = await repository.update(original.id, { name: 'Updated Name' });

      // Assert
      expect(updated).not.toBeNull();
      expect(updated?.name).toBe('Updated Name');
      expect(updated?.id).toBe(original.id);
    });

    it('should return null when updating a non-existent tag id', async () => {
      // Act
      const result = await repository.update('00000000-0000-0000-0000-000000000000', {
        name: 'Ghost',
      });

      // Assert
      expect(result).toBeNull();
    });
  });

  // ─── delete ───────────────────────────────────────────────────────────────

  describe('delete()', () => {
    it('should delete the tag and return true', async () => {
      // Arrange
      const tag = await repository.create(TagFactory.buildInput());

      // Act
      const result = await repository.delete(tag.id);

      // Assert
      expect(result).toBe(true);
      const found = await repository.findById(tag.id);
      expect(found).toBeNull();
    });

    it('should return false when deleting a non-existent id', async () => {
      // Act
      const result = await repository.delete('00000000-0000-0000-0000-000000000000');

      // Assert
      expect(result).toBe(false);
    });
  });
});
