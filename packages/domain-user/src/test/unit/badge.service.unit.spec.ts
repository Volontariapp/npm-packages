import type { jest } from '@jest/globals';
import { describe, it, expect, beforeEach } from '@jest/globals';
import { BadgeService } from '../../services/badge.service.js';
import type { IBadgeRepository } from '../../repositories/interfaces/badge.repository.js';
import { BadgeFactory } from '../__test-utils__/factories/badge.factory.js';
import { createBadgeRepositoryMock } from '../__test-utils__/mocks/badge.repository.mock.js';
import { BadgeId, BadgeSlug, UpdateBadgeInput } from '../../value-objects/index.js';

describe('BadgeService (Unit)', () => {
  let service: BadgeService;
  let mockRepository: jest.Mocked<IBadgeRepository>;

  beforeEach(() => {
    mockRepository = createBadgeRepositoryMock();
    service = new BadgeService(mockRepository);
  });

  describe('findById()', () => {
    it('should return badge when found', async () => {
      const badge = BadgeFactory.build({ id: 'b-1' });
      mockRepository.findById.mockResolvedValue(badge);

      const result = await service.findById(new BadgeId('b-1'));

      expect(result).toEqual(badge);
      expect(mockRepository.findById.mock.calls).toEqual([['b-1']]);
    });

    it('should throw BADGE_NOT_FOUND when not found', async () => {
      mockRepository.findById.mockResolvedValue(null);
      await expect(service.findById(new BadgeId('missing'))).rejects.toMatchObject({
        code: 'NOT_FOUND',
      });
    });

    it('should throw DATABASE_ERROR when repository throws', async () => {
      mockRepository.findById.mockRejectedValue(new Error('fail'));
      await expect(service.findById(new BadgeId('b-1'))).rejects.toMatchObject({
        code: 'DATABASE_ERROR',
      });
    });
  });

  describe('findBySlug()', () => {
    it('should return badge when found by slug', async () => {
      const badge = BadgeFactory.build({ slug: 's-1' });
      mockRepository.findBySlug.mockResolvedValue(badge);

      const result = await service.findBySlug(new BadgeSlug('s-1'));

      expect(result).toEqual(badge);
      expect(mockRepository.findBySlug.mock.calls).toEqual([['s-1']]);
    });

    it('should throw BADGE_NOT_FOUND when missing', async () => {
      mockRepository.findBySlug.mockResolvedValue(null);
      await expect(service.findBySlug(new BadgeSlug('missing'))).rejects.toMatchObject({
        code: 'NOT_FOUND',
      });
    });
  });

  describe('findAll()', () => {
    it('should return all badges', async () => {
      const badges = BadgeFactory.buildMany(3);
      mockRepository.findAll.mockResolvedValue(badges);
      const result = await service.findAll();
      expect(result).toEqual(badges);
    });

    it('should throw DATABASE_ERROR when repository fails', async () => {
      mockRepository.findAll.mockRejectedValue(new Error('fail'));
      await expect(service.findAll()).rejects.toMatchObject({ code: 'DATABASE_ERROR' });
    });
  });

  describe('findManyByIds()', () => {
    it('should return badges by ids', async () => {
      const badges = BadgeFactory.buildMany(2);
      mockRepository.findManyByIds.mockResolvedValue(badges);

      const result = await service.findManyByIds([new BadgeId('a'), new BadgeId('b')]);

      expect(result).toEqual(badges);
      expect(mockRepository.findManyByIds.mock.calls).toEqual([[['a', 'b']]]);
    });

    it('should throw DATABASE_ERROR when repository fails', async () => {
      mockRepository.findManyByIds.mockRejectedValue(new Error('fail'));
      await expect(service.findManyByIds([new BadgeId('a')])).rejects.toMatchObject({
        code: 'DATABASE_ERROR',
      });
    });
  });

  describe('create()', () => {
    it('should create and return badge', async () => {
      const input = BadgeFactory.buildInput();
      const created = BadgeFactory.build({
        name: input.name,
        slug: input.slug,
        description: input.description,
      });
      mockRepository.create.mockResolvedValue(created);

      const result = await service.create(input);

      expect(result).toEqual(created);
      expect(mockRepository.create).toHaveBeenCalledTimes(1);
    });

    it('should throw BADGE_ALREADY_EXISTS on duplicate slug', async () => {
      const input = BadgeFactory.buildInput();
      mockRepository.create.mockRejectedValue({ code: '23505' });
      await expect(service.create(input)).rejects.toMatchObject({ code: 'CONFLICT' });
    });

    it('should throw DATABASE_ERROR when repository fails', async () => {
      const input = BadgeFactory.buildInput();
      mockRepository.create.mockRejectedValue(new Error('fail'));
      await expect(service.create(input)).rejects.toMatchObject({ code: 'DATABASE_ERROR' });
    });
  });

  describe('update()', () => {
    it('should update and return badge', async () => {
      const updated = BadgeFactory.build({ id: 'b-1', name: 'New' });
      mockRepository.update.mockResolvedValue(updated);

      const result = await service.update(
        new BadgeId('b-1'),
        new UpdateBadgeInput({ name: 'New' }),
      );

      expect(result).toEqual(updated);
      expect(mockRepository.update.mock.calls).toEqual([['b-1', { name: 'New' }]]);
    });

    it('should throw BADGE_NOT_FOUND when repository returns null', async () => {
      mockRepository.update.mockResolvedValue(null);
      await expect(
        service.update(new BadgeId('missing'), new UpdateBadgeInput({})),
      ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    });

    it('should throw DATABASE_ERROR when repository fails', async () => {
      mockRepository.update.mockRejectedValue(new Error('fail'));
      await expect(
        service.update(new BadgeId('b-1'), new UpdateBadgeInput({})),
      ).rejects.toMatchObject({ code: 'DATABASE_ERROR' });
    });
  });

  describe('delete()', () => {
    it('should delete badge when repository returns true', async () => {
      mockRepository.delete.mockResolvedValue(true);
      await service.delete(new BadgeId('b-1'));
      expect(mockRepository.delete.mock.calls).toEqual([['b-1']]);
    });

    it('should throw BADGE_NOT_FOUND when repository returns false', async () => {
      mockRepository.delete.mockResolvedValue(false);
      await expect(service.delete(new BadgeId('missing'))).rejects.toMatchObject({
        code: 'NOT_FOUND',
      });
    });

    it('should throw DATABASE_ERROR when repository fails', async () => {
      mockRepository.delete.mockRejectedValue(new Error('fail'));
      await expect(service.delete(new BadgeId('b-1'))).rejects.toMatchObject({
        code: 'DATABASE_ERROR',
      });
    });
  });
});
