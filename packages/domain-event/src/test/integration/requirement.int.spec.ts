import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { initializeTestDb, closeTestDb, truncateAll, getTestRepository } from '../data-source.js';
import { RequirementModel } from '../../models/requirement.model.js';
import { PostgresRequirementRepository } from '../../repositories/postgres-requirement.repository.js';
import { RequirementEntity } from '../../entities/requirement.entity.js';
import { RequirementFactory } from '../__test-utils__/factories/requirement.factory.js';

describe('PostgresRequirementRepository (Integration)', () => {
  let repository: PostgresRequirementRepository;

  beforeAll(async () => {
    await initializeTestDb();
    repository = new PostgresRequirementRepository(getTestRepository(RequirementModel));
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await truncateAll();
  });

  // ─── create ───────────────────────────────────────────────────────────────

  describe('create()', () => {
    it('should persist a requirement and return a mapped RequirementEntity', async () => {
      // Arrange
      const input = RequirementFactory.buildInput();

      // Act
      const result = await repository.create(input);

      // Assert
      expect(result).toBeInstanceOf(RequirementEntity);
      expect(result.id).toBeDefined();
      expect(result.name).toBe(input.name);
      expect(result.quantity).toBe(input.quantity);
      expect(result.currentQuantity).toBe(input.currentQuantity);
      expect(result.isSystem).toBe(input.isSystem);
    });

    it('should generate a UUID for the id', async () => {
      // Arrange
      const input = RequirementFactory.buildInput();

      // Act
      const result = await repository.create(input);

      // Assert
      expect(result.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    });

    it('should persist a system requirement correctly', async () => {
      // Arrange
      const input = RequirementFactory.buildInput({ isSystem: true });

      // Act
      const result = await repository.create(input);

      // Assert
      expect(result.isSystem).toBe(true);
    });
  });

  // ─── findById ─────────────────────────────────────────────────────────────

  describe('findById()', () => {
    it('should return the requirement when it exists', async () => {
      // Arrange
      const created = await repository.create(RequirementFactory.buildInput());

      // Act
      const result = await repository.findById(created.id);

      // Assert
      expect(result).not.toBeNull();
      expect(result?.id).toBe(created.id);
      expect(result?.name).toBe(created.name);
    });

    it('should return null when the requirement does not exist', async () => {
      // Act
      const result = await repository.findById('00000000-0000-0000-0000-000000000000');

      // Assert
      expect(result).toBeNull();
    });
  });

  // ─── findAll ──────────────────────────────────────────────────────────────

  describe('findAll()', () => {
    it('should return all persisted requirements', async () => {
      // Arrange
      await repository.create(RequirementFactory.buildInput());
      await repository.create(RequirementFactory.buildInput());

      // Act
      const result = await repository.findAll();

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0]).toBeInstanceOf(RequirementEntity);
    });

    it('should return an empty array when no requirements are persisted', async () => {
      // Act
      const result = await repository.findAll();

      // Assert
      expect(result).toHaveLength(0);
    });
  });

  // ─── update ───────────────────────────────────────────────────────────────

  describe('update()', () => {
    it('should update the requirement fields and return the updated entity', async () => {
      // Arrange
      const original = await repository.create(RequirementFactory.buildInput({ quantity: 5 }));

      // Act
      const updated = await repository.update(original.id, { quantity: 20 });

      // Assert
      expect(updated).not.toBeNull();
      expect(updated?.quantity).toBe(20);
      expect(updated?.id).toBe(original.id);
    });

    it('should persist the updated currentQuantity', async () => {
      // Arrange
      const original = await repository.create(
        RequirementFactory.buildInput({ currentQuantity: 0 }),
      );

      // Act
      const updated = await repository.update(original.id, { currentQuantity: 5 });

      // Assert
      expect(updated?.currentQuantity).toBe(5);
    });

    it('should return null when updating a non-existent requirement', async () => {
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
    it('should delete the requirement and return true', async () => {
      // Arrange
      const req = await repository.create(RequirementFactory.buildInput());

      // Act
      const result = await repository.delete(req.id);

      // Assert
      expect(result).toBe(true);
      const found = await repository.findById(req.id);
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
