import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { UserService } from '../../services/user.service.js';
import type { BadgeService } from '../../services/badge.service.js';
import type { IUserRepository } from '../../repositories/interfaces/user.repository.js';
import { UserFactory } from '../__test-utils__/factories/user.factory.js';
import { createUserRepositoryMock } from '../__test-utils__/mocks/user.repository.mock.js';
import { BadgeFactory } from '../__test-utils__/factories/badge.factory.js';

describe('UserService (Unit)', () => {
  let service: UserService;
  let mockRepository: jest.Mocked<IUserRepository>;
  let mockBadgeService: jest.Mocked<Pick<BadgeService, 'findById'>>;

  beforeEach(() => {
    mockRepository = createUserRepositoryMock();
    mockBadgeService = { findById: jest.fn() };
    service = new UserService(mockRepository, mockBadgeService as unknown as BadgeService);
  });

  // ─── findById ──────────────────────────────────────────────────────────────
  describe('findById()', () => {
    it('should return the user when found', async () => {
      // Arrange
      const user = UserFactory.build({ id: 'u-1' });
      mockRepository.findById.mockResolvedValue(user);

      // Act
      const result = await service.findById('u-1');

      // Assert
      expect(result).toEqual(user);
      expect(mockRepository.findById.mock.calls).toEqual([['u-1']]);
    });

    it('should throw USER_NOT_FOUND when repository returns null', async () => {
      // Arrange
      mockRepository.findById.mockResolvedValue(null);

      // Act + Assert
      await expect(service.findById('missing')).rejects.toMatchObject({ code: 'NOT_FOUND' });
    });

    it('should throw DATABASE_ERROR when repository throws', async () => {
      // Arrange
      mockRepository.findById.mockRejectedValue(new Error('Query failed'));

      // Act + Assert
      await expect(service.findById('u-1')).rejects.toMatchObject({ code: 'DATABASE_ERROR' });
    });
  });

  // ─── findByEmail ───────────────────────────────────────────────────────────
  describe('findByEmail()', () => {
    it('should return the user when found by email', async () => {
      const user = UserFactory.build({ email: 'a@b.com' });
      mockRepository.findByEmail.mockResolvedValue(user);

      const result = await service.findByEmail('a@b.com');

      expect(result).toEqual(user);
      expect(mockRepository.findByEmail.mock.calls).toEqual([['a@b.com']]);
    });

    it('should throw USER_NOT_FOUND when not found by email', async () => {
      mockRepository.findByEmail.mockResolvedValue(null);
      await expect(service.findByEmail('x@y.com')).rejects.toMatchObject({ code: 'NOT_FOUND' });
    });
  });

  // ─── findByRna ─────────────────────────────────────────────────────────────
  describe('findByRna()', () => {
    it('should return the user when found by rna', async () => {
      const user = UserFactory.build({ rna: 'W123456789' });
      mockRepository.findByRna.mockResolvedValue(user);

      const result = await service.findByRna('W123456789');

      expect(result).toEqual(user);
      expect(mockRepository.findByRna.mock.calls).toEqual([['W123456789']]);
    });

    it('should throw USER_NOT_FOUND when not found by rna', async () => {
      mockRepository.findByRna.mockResolvedValue(null);
      await expect(service.findByRna('W000000000')).rejects.toMatchObject({ code: 'NOT_FOUND' });
    });
  });

  // ─── findAll ───────────────────────────────────────────────────────────────
  describe('findAll()', () => {
    it('should return users and count', async () => {
      const users = UserFactory.buildMany(2);
      mockRepository.findAll.mockResolvedValue([users, users.length]);

      const result = await service.findAll(10, 0);

      expect(result).toEqual([users, users.length]);
      expect(mockRepository.findAll.mock.calls).toEqual([[10, 0]]);
    });

    it('should throw DATABASE_ERROR when repository fails', async () => {
      mockRepository.findAll.mockRejectedValue(new Error('db'));
      await expect(service.findAll()).rejects.toMatchObject({ code: 'DATABASE_ERROR' });
    });
  });

  // ─── create ───────────────────────────────────────────────────────────────
  describe('create()', () => {
    it('should create and return the user', async () => {
      const input = UserFactory.buildInput();
      const created = UserFactory.build({ ...input });
      mockRepository.create.mockResolvedValue(created);

      const result = await service.create(input);

      expect(result).toEqual(created);
      expect(mockRepository.create.mock.calls).toEqual([[input]]);
    });

    it('should throw BAD_REQUEST for invalid rna', async () => {
      const input = UserFactory.buildInput({ rna: 'invalid' });
      await expect(service.create(input)).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    });

    it('should throw USER_ALREADY_EXISTS on duplicate error', async () => {
      const input = UserFactory.buildInput();
      mockRepository.create.mockRejectedValue({ code: '23505' });
      await expect(service.create(input)).rejects.toMatchObject({ code: 'CONFLICT' });
    });

    it('should throw DATABASE_ERROR on repository error', async () => {
      const input = UserFactory.buildInput();
      mockRepository.create.mockRejectedValue(new Error('Insert failed'));
      await expect(service.create(input)).rejects.toMatchObject({ code: 'DATABASE_ERROR' });
    });
  });

  // ─── update ───────────────────────────────────────────────────────────────
  describe('update()', () => {
    it('should update and return the updated user', async () => {
      const updated = UserFactory.build({ id: 'u-1', pseudo: 'new' });
      mockRepository.update.mockResolvedValue(updated);

      const result = await service.update('u-1', { pseudo: 'new' });

      expect(result).toEqual(updated);
      expect(mockRepository.update.mock.calls).toEqual([['u-1', { pseudo: 'new' }]]);
    });

    it('should throw USER_NOT_FOUND when update returns null', async () => {
      mockRepository.update.mockResolvedValue(null);
      await expect(service.update('missing', {})).rejects.toMatchObject({ code: 'NOT_FOUND' });
    });

    it('should throw BAD_REQUEST for invalid rna on update', async () => {
      await expect(service.update('u-1', { rna: 'bad' })).rejects.toMatchObject({
        code: 'BAD_REQUEST',
      });
    });
  });

  // ─── delete ───────────────────────────────────────────────────────────────
  describe('delete()', () => {
    it('should delete user when repository returns true', async () => {
      mockRepository.delete.mockResolvedValue(true);
      await service.delete('u-1');
      expect(mockRepository.delete.mock.calls).toEqual([['u-1']]);
    });

    it('should throw USER_NOT_FOUND when delete returns false', async () => {
      mockRepository.delete.mockResolvedValue(false);
      await expect(service.delete('missing')).rejects.toMatchObject({ code: 'NOT_FOUND' });
    });
  });

  // ─── badges ───────────────────────────────────────────────────────────────
  describe('addBadgeToUser()', () => {
    it('should add badge to user when not present', async () => {
      const user = UserFactory.build({ id: 'u-1', badges: [] });
      const badge = BadgeFactory.build({ id: 'b-1' });
      mockRepository.findById.mockResolvedValue(user);
      mockBadgeService.findById.mockResolvedValue(badge);
      mockRepository.addBadgeToUser.mockResolvedValue();

      await service.addBadgeToUser('u-1', 'b-1');

      expect(mockRepository.addBadgeToUser.mock.calls).toEqual([['u-1', 'b-1']]);
    });

    it('should throw USER_ALREADY_HAS_BADGE when badge already exists', async () => {
      const user = UserFactory.build({ id: 'u-1', badges: [BadgeFactory.build({ id: 'b-1' })] });
      mockRepository.findById.mockResolvedValue(user);
      mockBadgeService.findById.mockResolvedValue(BadgeFactory.build({ id: 'b-1' }));

      await expect(service.addBadgeToUser('u-1', 'b-1')).rejects.toMatchObject({
        code: 'CONFLICT',
      });
    });
  });

  describe('removeBadgeFromUser()', () => {
    it('should remove badge when present', async () => {
      const user = UserFactory.build({ id: 'u-1', badges: [BadgeFactory.build({ id: 'b-1' })] });
      mockRepository.findById.mockResolvedValue(user);
      mockRepository.removeBadgeFromUser.mockResolvedValue();

      await service.removeBadgeFromUser('u-1', 'b-1');

      expect(mockRepository.removeBadgeFromUser.mock.calls).toEqual([['u-1', 'b-1']]);
    });

    it('should throw USER_BADGE_NOT_FOUND when badge not present', async () => {
      const user = UserFactory.build({ id: 'u-1', badges: [] });
      mockRepository.findById.mockResolvedValue(user);

      await expect(service.removeBadgeFromUser('u-1', 'b-1')).rejects.toMatchObject({
        code: 'NOT_FOUND',
      });
    });
  });

  // ─── impact score ────────────────────────────────────────────────────────
  describe('incrementImpactScore()', () => {
    it('should call repository to increment when score valid', async () => {
      mockRepository.incrementImpactScore.mockResolvedValue();
      await service.incrementImpactScore('u-1', 5);
      expect(mockRepository.incrementImpactScore.mock.calls).toEqual([['u-1', 5]]);
    });

    it('should throw BAD_REQUEST when score is not positive', async () => {
      await expect(service.incrementImpactScore('u-1', 0)).rejects.toMatchObject({
        code: 'BAD_REQUEST',
      });
    });

    it('should throw DATABASE_ERROR when repository throws', async () => {
      mockRepository.incrementImpactScore.mockRejectedValue(new Error('fail'));
      await expect(service.incrementImpactScore('u-1', 3)).rejects.toMatchObject({
        code: 'DATABASE_ERROR',
      });
    });
  });
});
