import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { TagService } from '../../services/tag.service.js';
import type { ITagRepository } from '../../repositories/interfaces/tag.repository.js';
import { TagFactory } from '../__test-utils__/factories/tag.factory.js';
import { createTagRepositoryMock } from '../__test-utils__/mocks/tag.repository.mock.js';

describe('TagService (Unit)', () => {
  let service: TagService;
  let mockRepository: jest.Mocked<ITagRepository>;

  beforeEach(() => {
    mockRepository = createTagRepositoryMock();
    service = new TagService(mockRepository);
  });

  // ─── findAll ──────────────────────────────────────────────────────────────

  describe('findAll()', () => {
    it('should return all tags from the repository', async () => {
      // Arrange
      const tags = TagFactory.buildMany(3);
      mockRepository.findAll.mockResolvedValue(tags);

      // Act
      const result = await service.findAll();

      // Assert
      expect(result).toEqual(tags);
      expect(mockRepository.findAll).toHaveBeenCalledTimes(1);
    });

    it('should return an empty array when no tags exist', async () => {
      // Arrange
      mockRepository.findAll.mockResolvedValue([]);

      // Act
      const result = await service.findAll();

      // Assert
      expect(result).toHaveLength(0);
    });

    it('should throw DATABASE_ERROR when the repository throws', async () => {
      // Arrange
      mockRepository.findAll.mockRejectedValue(new Error('Connection refused'));

      // Act + Assert
      await expect(service.findAll()).rejects.toMatchObject({ code: 'DATABASE_ERROR' });
    });
  });

  // ─── findById ─────────────────────────────────────────────────────────────

  describe('findById()', () => {
    it('should return the tag when found', async () => {
      // Arrange
      const tag = TagFactory.build({ id: 'tag-1' });
      mockRepository.findById.mockResolvedValue(tag);

      // Act
      const result = await service.findById('tag-1');

      // Assert
      expect(result).toEqual(tag);
      expect(mockRepository.findById).toHaveBeenCalledWith('tag-1');
    });

    it('should throw TAG_NOT_FOUND when the repository returns null', async () => {
      // Arrange
      mockRepository.findById.mockResolvedValue(null);

      // Act + Assert
      await expect(service.findById('missing-id')).rejects.toMatchObject({
        code: 'NOT_FOUND',
        message: expect.stringContaining('missing-id'),
      });
    });

    it('should rethrow a BaseError without wrapping', async () => {
      // Arrange — TAG_NOT_FOUND is already a BaseError
      mockRepository.findById.mockResolvedValue(null);

      // Act + Assert — must not be wrapped in DATABASE_ERROR
      await expect(service.findById('x')).rejects.toMatchObject({ code: 'NOT_FOUND' });
    });

    it('should throw DATABASE_ERROR when the repository throws a generic error', async () => {
      // Arrange
      mockRepository.findById.mockRejectedValue(new Error('DB failure'));

      // Act + Assert
      await expect(service.findById('tag-1')).rejects.toMatchObject({ code: 'DATABASE_ERROR' });
    });
  });

  // ─── findByIds ────────────────────────────────────────────────────────────

  describe('findByIds()', () => {
    it('should return matching tags for the given ids', async () => {
      // Arrange
      const tags = TagFactory.buildMany(2);
      const ids = tags.map((t) => t.id);
      mockRepository.findByIds.mockResolvedValue(tags);

      // Act
      const result = await service.findByIds(ids);

      // Assert
      expect(result).toEqual(tags);
      expect(mockRepository.findByIds).toHaveBeenCalledWith(ids);
    });

    it('should throw DATABASE_ERROR when the repository throws', async () => {
      // Arrange
      mockRepository.findByIds.mockRejectedValue(new Error('Query error'));

      // Act + Assert
      await expect(service.findByIds(['id-1'])).rejects.toMatchObject({ code: 'DATABASE_ERROR' });
    });
  });

  // ─── findBySlug ───────────────────────────────────────────────────────────

  describe('findBySlug()', () => {
    it('should return the tag matching the slug', async () => {
      // Arrange
      const tag = TagFactory.build({ slug: 'nature' });
      mockRepository.findBySlug.mockResolvedValue(tag);

      // Act
      const result = await service.findBySlug('nature');

      // Assert
      expect(result).toEqual(tag);
      expect(mockRepository.findBySlug).toHaveBeenCalledWith('nature');
    });

    it('should throw TAG_NOT_FOUND when the repository returns null', async () => {
      // Arrange
      mockRepository.findBySlug.mockResolvedValue(null);

      // Act + Assert
      await expect(service.findBySlug('unknown-slug')).rejects.toMatchObject({
        code: 'NOT_FOUND',
        message: expect.stringContaining('unknown-slug'),
      });
    });

    it('should throw DATABASE_ERROR when the repository throws', async () => {
      // Arrange
      mockRepository.findBySlug.mockRejectedValue(new Error('DB error'));

      // Act + Assert
      await expect(service.findBySlug('slug')).rejects.toMatchObject({ code: 'DATABASE_ERROR' });
    });
  });

  // ─── create ───────────────────────────────────────────────────────────────

  describe('create()', () => {
    it('should create and return a tag when slug is unique', async () => {
      // Arrange
      const input = TagFactory.buildInput();
      const created = TagFactory.build({ ...input });
      mockRepository.findBySlug.mockResolvedValue(null);
      mockRepository.create.mockResolvedValue(created);

      // Act
      const result = await service.create(input);

      // Assert
      expect(result).toEqual(created);
      expect(mockRepository.findBySlug).toHaveBeenCalledWith(input.slug);
      expect(mockRepository.create).toHaveBeenCalledWith(input);
    });

    it('should skip slug uniqueness check when slug is undefined', async () => {
      // Arrange
      const input = { name: 'No Slug', balise: '#none' };
      const created = TagFactory.build({ name: 'No Slug' });
      mockRepository.create.mockResolvedValue(created);

      // Act
      const result = await service.create(input);

      // Assert
      expect(result).toEqual(created);
      expect(mockRepository.findBySlug).not.toHaveBeenCalled();
    });

    it('should skip slug uniqueness check when slug is empty string', async () => {
      // Arrange
      const input = { name: 'Empty Slug', slug: '', balise: '#empty' };
      const created = TagFactory.build({ name: 'Empty Slug', slug: '' });
      mockRepository.create.mockResolvedValue(created);

      // Act
      const result = await service.create(input);

      // Assert
      expect(result).toEqual(created);
      expect(mockRepository.findBySlug).not.toHaveBeenCalled();
    });

    it('should throw TAG_ALREADY_EXISTS when slug is already taken', async () => {
      // Arrange
      const existingTag = TagFactory.build({ slug: 'taken-slug' });
      mockRepository.findBySlug.mockResolvedValue(existingTag);

      // Act + Assert
      await expect(service.create({ slug: 'taken-slug' })).rejects.toMatchObject({
        code: 'CONFLICT',
        message: expect.stringContaining('taken-slug'),
      });
      expect(mockRepository.create).not.toHaveBeenCalled();
    });

    it('should throw DATABASE_ERROR when repository.create throws', async () => {
      // Arrange
      mockRepository.findBySlug.mockResolvedValue(null);
      mockRepository.create.mockRejectedValue(new Error('Insert failed'));

      // Act + Assert
      await expect(service.create({ slug: 'new-slug' })).rejects.toMatchObject({
        code: 'DATABASE_ERROR',
      });
    });
  });

  // ─── update ───────────────────────────────────────────────────────────────

  describe('update()', () => {
    it('should find, merge, update, and return the updated tag', async () => {
      // Arrange
      const existing = TagFactory.build({ id: 'tag-1', name: 'Old Name' });
      const updated = TagFactory.build({ id: 'tag-1', name: 'New Name' });
      mockRepository.findById.mockResolvedValue(existing);
      mockRepository.update.mockResolvedValue(updated);

      // Spy — verifying the merged object is passed to the repository
      const updateSpy = jest.spyOn(mockRepository, 'update');

      // Act
      const result = await service.update('tag-1', { name: 'New Name' });

      // Assert
      expect(result).toEqual(updated);
      expect(updateSpy).toHaveBeenCalledWith(
        'tag-1',
        expect.objectContaining({ name: 'New Name' }),
      );
    });

    it('should throw TAG_NOT_FOUND when the tag does not exist', async () => {
      // Arrange
      mockRepository.findById.mockResolvedValue(null);

      // Act + Assert
      await expect(service.update('missing', { name: 'X' })).rejects.toMatchObject({
        code: 'NOT_FOUND',
      });
      expect(mockRepository.update).not.toHaveBeenCalled();
    });

    it('should throw TAG_NOT_FOUND when repository.update returns null', async () => {
      // Arrange
      const existing = TagFactory.build({ id: 'tag-1' });
      mockRepository.findById.mockResolvedValue(existing);
      mockRepository.update.mockResolvedValue(null);

      // Act + Assert
      await expect(service.update('tag-1', { name: 'X' })).rejects.toMatchObject({
        code: 'NOT_FOUND',
      });
    });

    it('should throw DATABASE_ERROR when repository.update throws a generic error', async () => {
      // Arrange
      const existing = TagFactory.build({ id: 'tag-1' });
      mockRepository.findById.mockResolvedValue(existing);
      mockRepository.update.mockRejectedValue(new Error('Update crash'));

      // Act + Assert
      await expect(service.update('tag-1', {})).rejects.toMatchObject({ code: 'DATABASE_ERROR' });
    });
  });

  // ─── delete ───────────────────────────────────────────────────────────────

  describe('delete()', () => {
    it('should find and delete the tag successfully', async () => {
      // Arrange
      const tag = TagFactory.build({ id: 'tag-1' });
      mockRepository.findById.mockResolvedValue(tag);
      mockRepository.delete.mockResolvedValue(true);

      // Spy — ensure delete is called with the correct id
      const deleteSpy = jest.spyOn(mockRepository, 'delete');

      // Act
      await service.delete('tag-1');

      // Assert
      expect(deleteSpy).toHaveBeenCalledWith('tag-1');
    });

    it('should throw TAG_NOT_FOUND when the tag does not exist', async () => {
      // Arrange
      mockRepository.findById.mockResolvedValue(null);

      // Act + Assert
      await expect(service.delete('missing')).rejects.toMatchObject({ code: 'NOT_FOUND' });
      expect(mockRepository.delete).not.toHaveBeenCalled();
    });

    it('should throw DATABASE_ERROR when repository.delete throws', async () => {
      // Arrange
      const tag = TagFactory.build({ id: 'tag-1' });
      mockRepository.findById.mockResolvedValue(tag);
      mockRepository.delete.mockRejectedValue(new Error('Delete failed'));

      // Act + Assert
      await expect(service.delete('tag-1')).rejects.toMatchObject({ code: 'DATABASE_ERROR' });
    });
  });
});
