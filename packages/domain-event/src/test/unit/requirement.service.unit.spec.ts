import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { RequirementService } from '../../services/requirement.service.js';
import type { IRequirementRepository } from '../../repositories/interfaces/requirement.repository.js';
import { RequirementFactory } from '../__test-utils__/factories/requirement.factory.js';
import { createRequirementRepositoryMock } from '../__test-utils__/mocks/requirement.repository.mock.js';

describe('RequirementService (Unit)', () => {
  let service: RequirementService;
  let mockRepository: jest.Mocked<IRequirementRepository>;

  beforeEach(() => {
    mockRepository = createRequirementRepositoryMock();
    service = new RequirementService(mockRepository);
  });

  // ─── findAll ──────────────────────────────────────────────────────────────

  describe('findAll()', () => {
    it('should return all requirements from the repository', async () => {
      // Arrange
      const requirements = RequirementFactory.buildMany(3);
      mockRepository.findAll.mockResolvedValue(requirements);

      // Act
      const result = await service.findAll();

      // Assert
      expect(result).toEqual(requirements);
      expect(mockRepository.findAll).toHaveBeenCalledTimes(1);
    });

    it('should return an empty array when no requirements exist', async () => {
      // Arrange
      mockRepository.findAll.mockResolvedValue([]);

      // Act
      const result = await service.findAll();

      // Assert
      expect(result).toHaveLength(0);
    });

    it('should throw DATABASE_ERROR when the repository throws', async () => {
      // Arrange
      mockRepository.findAll.mockRejectedValue(new Error('Connection error'));

      // Act + Assert
      await expect(service.findAll()).rejects.toMatchObject({ code: 'DATABASE_ERROR' });
    });
  });

  // ─── findById ─────────────────────────────────────────────────────────────

  describe('findById()', () => {
    it('should return the requirement when found', async () => {
      // Arrange
      const requirement = RequirementFactory.build({ id: 'req-1' });
      mockRepository.findById.mockResolvedValue(requirement);

      // Act
      const result = await service.findById('req-1');

      // Assert
      expect(result).toEqual(requirement);
      expect(mockRepository.findById).toHaveBeenCalledWith('req-1');
    });

    it('should throw REQUIREMENT_NOT_FOUND when the repository returns null', async () => {
      // Arrange
      mockRepository.findById.mockResolvedValue(null);

      // Act + Assert
      await expect(service.findById('missing-id')).rejects.toMatchObject({
        code: 'NOT_FOUND',
        message: expect.stringContaining('missing-id'),
      });
    });

    it('should throw DATABASE_ERROR when the repository throws a generic error', async () => {
      // Arrange
      mockRepository.findById.mockRejectedValue(new Error('Query failed'));

      // Act + Assert
      await expect(service.findById('req-1')).rejects.toMatchObject({ code: 'DATABASE_ERROR' });
    });
  });

  // ─── create ───────────────────────────────────────────────────────────────

  describe('create()', () => {
    it('should create and return the requirement', async () => {
      // Arrange
      const input = RequirementFactory.buildInput();
      const created = RequirementFactory.build({ ...input });
      mockRepository.create.mockResolvedValue(created);

      // Act
      const result = await service.create(input);

      // Assert
      expect(result).toEqual(created);
      expect(mockRepository.create).toHaveBeenCalledWith(input);
    });

    it('should throw DATABASE_ERROR when the repository throws', async () => {
      // Arrange
      mockRepository.create.mockRejectedValue(new Error('Insert failed'));

      // Act + Assert
      await expect(service.create({ name: 'Volunteer' })).rejects.toMatchObject({
        code: 'DATABASE_ERROR',
      });
    });
  });

  // ─── update ───────────────────────────────────────────────────────────────

  describe('update()', () => {
    it('should find, update, and return the updated requirement', async () => {
      // Arrange
      const existing = RequirementFactory.build({ id: 'req-1', name: 'Old' });
      const updated = RequirementFactory.build({ id: 'req-1', name: 'New' });
      mockRepository.findById.mockResolvedValue(existing);
      mockRepository.update.mockResolvedValue(updated);

      // Spy — verifying repository.update is called with the correct id
      const updateSpy = jest.spyOn(mockRepository, 'update');

      // Act
      const result = await service.update('req-1', { name: 'New' });

      // Assert
      expect(result).toEqual(updated);
      expect(updateSpy).toHaveBeenCalledWith('req-1', { name: 'New' });
    });

    it('should throw REQUIREMENT_NOT_FOUND when the requirement does not exist', async () => {
      // Arrange
      mockRepository.findById.mockResolvedValue(null);

      // Act + Assert
      await expect(service.update('missing', { name: 'X' })).rejects.toMatchObject({
        code: 'NOT_FOUND',
      });
      expect(mockRepository.update).not.toHaveBeenCalled();
    });

    it('should throw REQUIREMENT_NOT_FOUND when repository.update returns null', async () => {
      // Arrange
      const existing = RequirementFactory.build({ id: 'req-1' });
      mockRepository.findById.mockResolvedValue(existing);
      mockRepository.update.mockResolvedValue(null);

      // Act + Assert
      await expect(service.update('req-1', {})).rejects.toMatchObject({ code: 'NOT_FOUND' });
    });

    it('should throw DATABASE_ERROR when repository.update throws a generic error', async () => {
      // Arrange
      const existing = RequirementFactory.build({ id: 'req-1' });
      mockRepository.findById.mockResolvedValue(existing);
      mockRepository.update.mockRejectedValue(new Error('Update crash'));

      // Act + Assert
      await expect(service.update('req-1', {})).rejects.toMatchObject({ code: 'DATABASE_ERROR' });
    });
  });

  // ─── delete ───────────────────────────────────────────────────────────────

  describe('delete()', () => {
    it('should find and delete the requirement successfully', async () => {
      // Arrange
      const requirement = RequirementFactory.build({ id: 'req-1' });
      mockRepository.findById.mockResolvedValue(requirement);
      mockRepository.delete.mockResolvedValue(true);

      // Spy — ensuring delete is called with the correct id
      const deleteSpy = jest.spyOn(mockRepository, 'delete');

      // Act
      await service.delete('req-1');

      // Assert
      expect(deleteSpy).toHaveBeenCalledWith('req-1');
    });

    it('should throw REQUIREMENT_NOT_FOUND when the requirement does not exist', async () => {
      // Arrange
      mockRepository.findById.mockResolvedValue(null);

      // Act + Assert
      await expect(service.delete('missing')).rejects.toMatchObject({ code: 'NOT_FOUND' });
      expect(mockRepository.delete).not.toHaveBeenCalled();
    });

    it('should throw DATABASE_ERROR when repository.delete throws', async () => {
      // Arrange
      const requirement = RequirementFactory.build({ id: 'req-1' });
      mockRepository.findById.mockResolvedValue(requirement);
      mockRepository.delete.mockRejectedValue(new Error('Delete failed'));

      // Act + Assert
      await expect(service.delete('req-1')).rejects.toMatchObject({ code: 'DATABASE_ERROR' });
    });
  });
});
