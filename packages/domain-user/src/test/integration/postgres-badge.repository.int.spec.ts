import 'reflect-metadata';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { initializeTestDb, closeTestDb, truncateAll, getTestRepository } from '../data-source.js';
import { BadgeModel } from '../../models/badge.model.js';
import { PostgresBadgeRepository } from '../../repositories/postgres-badge.repository.js';
import { BadgeFactory } from '../__test-utils__/factories/badge.factory.js';
import { BadgeEntity } from '../../entities/badge.entity.js';

describe('PostgresBadgeRepository (Integration)', () => {
  let repository: PostgresBadgeRepository;

  beforeAll(async () => {
    await initializeTestDb();
    repository = new PostgresBadgeRepository(getTestRepository(BadgeModel));
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await truncateAll();
  });

  // ─── create ───────────────────────────────────────────────────────────────

  describe('create()', () => {
    it('should persist badge and return mapped BadgeEntity', async () => {
      // Arrange
      const input = BadgeFactory.buildInput({ iconPath: 'icon.svg' });

      // Act
      const result = await repository.create(input);

      // Assert
      expect(result).toBeInstanceOf(BadgeEntity);
      expect(result.id).toBeDefined();
      expect(result.name).toBe(input.name);
      expect(result.slug).toBe(input.slug);
      expect(result.description).toBe(input.description);
    });

    it('should generate UUID for id', async () => {
      // Arrange
      const input = BadgeFactory.buildInput({ iconPath: 'icon.svg' });

      // Act
      const result = await repository.create(input);

      // Assert
      expect(result.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    });

    it('should throw on duplicate slug (unique constraint)', async () => {
      // Arrange
      const input = BadgeFactory.buildInput({ slug: 'unique-slug', iconPath: 'icon.svg' });
      await repository.create(input);

      // Act & Assert
      await expect(repository.create(input)).rejects.toThrow();
    });
  });

  // ─── findById ─────────────────────────────────────────────────────────────

  describe('findById()', () => {
    it('should return BadgeEntity when badge exists', async () => {
      // Arrange
      const created = await repository.create(BadgeFactory.buildInput({ iconPath: 'icon.svg' }));

      // Act
      const result = await repository.findById(created.id);

      // Assert
      expect(result).not.toBeNull();
      expect(result?.id).toBe(created.id);
      expect(result?.slug).toBe(created.slug);
    });

    it('should return null when badge does not exist', async () => {
      // Act
      const result = await repository.findById('00000000-0000-0000-0000-000000000000');

      // Assert
      expect(result).toBeNull();
    });
  });

  // ─── findBySlug ───────────────────────────────────────────────────────────

  describe('findBySlug()', () => {
    it('should return badge when slug matches', async () => {
      // Arrange
      const created = await repository.create(
        BadgeFactory.buildInput({ slug: 'test-slug', iconPath: 'icon.svg' }),
      );

      // Act
      const result = await repository.findBySlug('test-slug');

      // Assert
      expect(result).not.toBeNull();
      expect(result?.id).toBe(created.id);
      expect(result?.slug).toBe('test-slug');
    });

    it('should return null when slug does not exist', async () => {
      // Act
      const result = await repository.findBySlug('nonexistent-slug');

      // Assert
      expect(result).toBeNull();
    });
  });

  // ─── findAll ──────────────────────────────────────────────────────────────

  describe('findAll()', () => {
    it('should return all persisted badges', async () => {
      // Arrange
      await repository.create(BadgeFactory.buildInput({ iconPath: 'icon.svg' }));
      await repository.create(BadgeFactory.buildInput({ iconPath: 'icon.svg' }));

      // Act
      const result = await repository.findAll();

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0]).toBeInstanceOf(BadgeEntity);
    });

    it('should return empty array when no badges exist', async () => {
      // Act
      const result = await repository.findAll();

      // Assert
      expect(result).toHaveLength(0);
    });
  });

  // ─── findManyByIds ────────────────────────────────────────────────────────

  describe('findManyByIds()', () => {
    it('should return badges matching the given IDs', async () => {
      // Arrange
      const badge1 = await repository.create(BadgeFactory.buildInput({ iconPath: 'icon.svg' }));
      const badge2 = await repository.create(BadgeFactory.buildInput({ iconPath: 'icon.svg' }));
      await repository.create(BadgeFactory.buildInput({ iconPath: 'icon.svg' }));

      // Act
      const result = await repository.findManyByIds([badge1.id, badge2.id]);

      // Assert
      expect(result).toHaveLength(2);
      expect(result.map((b) => b.id)).toEqual(expect.arrayContaining([badge1.id, badge2.id]));
    });

    it('should return empty array when IDs do not match any badge', async () => {
      // Act
      const result = await repository.findManyByIds(['00000000-0000-0000-0000-000000000000']);

      // Assert
      expect(result).toHaveLength(0);
    });
  });

  // ─── update ───────────────────────────────────────────────────────────────

  describe('update()', () => {
    it('should update badge name and return updated entity', async () => {
      // Arrange
      const created = await repository.create(
        BadgeFactory.buildInput({ name: 'Original Name', iconPath: 'icon.svg' }),
      );

      // Act
      const result = await repository.update(created.id, { name: 'Updated Name' });

      // Assert
      expect(result).not.toBeNull();
      expect(result?.id).toBe(created.id);
      expect(result?.name).toBe('Updated Name');
    });

    it('should update badge description without touching other fields', async () => {
      // Arrange
      const created = await repository.create(
        BadgeFactory.buildInput({ slug: 'my-slug', iconPath: 'icon.svg' }),
      );

      // Act
      const result = await repository.update(created.id, { description: 'New description' });

      // Assert
      expect(result?.description).toBe('New description');
      expect(result?.slug).toBe('my-slug');
    });

    it('should return null when updating non-existent badge', async () => {
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
    it('should delete badge and return true', async () => {
      // Arrange
      const created = await repository.create(BadgeFactory.buildInput({ iconPath: 'icon.svg' }));

      // Act
      const result = await repository.delete(created.id);

      // Assert
      expect(result).toBe(true);
      const found = await repository.findById(created.id);
      expect(found).toBeNull();
    });

    it('should return false when deleting non-existent badge', async () => {
      // Act
      const result = await repository.delete('00000000-0000-0000-0000-000000000000');

      // Assert
      expect(result).toBe(false);
    });
  });
});
