import type { jest } from '@jest/globals';
import { describe, it, expect, beforeEach } from '@jest/globals';
import { SocialUserService } from '../../services/social-user.service.js';
import type { ISocialUserRepository } from '../../repositories/interfaces/social-user.repository.js';
import { createSocialUserRepositoryMock } from '../__test-utils__/mocks/social-user.repository.mock.js';

describe('SocialUserService (Unit)', () => {
  let service: SocialUserService;
  let mockRepository: jest.Mocked<ISocialUserRepository>;

  beforeEach(() => {
    mockRepository = createSocialUserRepositoryMock();
    service = new SocialUserService(mockRepository);
  });

  // ─── createUser ───────────────────────────────────────────────────────────

  describe('createUser()', () => {
    it('should call repository.createNode with the userId', async () => {
      mockRepository.createNode.mockResolvedValue(undefined);

      await service.createUser('user-1');

      expect(mockRepository.createNode).toHaveBeenCalledWith('user-1');
    });

    it('should rethrow a BaseError without wrapping', async () => {
      mockRepository.createNode.mockRejectedValue({
        code: 'DATABASE_QUERY_ERROR',
        isBaseError: true,
      });

      await expect(service.createUser('user-1')).rejects.toMatchObject({
        code: 'DATABASE_QUERY_ERROR',
        isBaseError: true,
      });
    });

    it('should throw DATABASE_ERROR on a generic repository failure', async () => {
      mockRepository.createNode.mockRejectedValue(new Error('Neo4j write failed'));

      await expect(service.createUser('user-1')).rejects.toMatchObject({
        code: 'DATABASE_ERROR',
      });
    });
  });

  // ─── deleteUser ───────────────────────────────────────────────────────────

  describe('deleteUser()', () => {
    it('should call repository.deleteNode with the userId', async () => {
      mockRepository.deleteNode.mockResolvedValue(undefined);

      await service.deleteUser('user-1');

      expect(mockRepository.deleteNode).toHaveBeenCalledWith('user-1');
    });

    it('should rethrow a BaseError without wrapping', async () => {
      mockRepository.deleteNode.mockRejectedValue({ code: 'NOT_FOUND', isBaseError: true });

      await expect(service.deleteUser('user-1')).rejects.toMatchObject({
        isBaseError: true,
      });
    });

    it('should throw DATABASE_ERROR on a generic repository failure', async () => {
      mockRepository.deleteNode.mockRejectedValue(new Error('Neo4j delete failed'));

      await expect(service.deleteUser('user-1')).rejects.toMatchObject({
        code: 'DATABASE_ERROR',
      });
    });
  });

  // ─── getUserExists ────────────────────────────────────────────────────────

  describe('getUserExists()', () => {
    it('should return true when the user node exists', async () => {
      mockRepository.exists.mockResolvedValue(true);

      const result = await service.getUserExists('user-1');

      expect(result).toBe(true);
      expect(mockRepository.exists).toHaveBeenCalledWith('user-1');
    });

    it('should return false when the user node does not exist', async () => {
      mockRepository.exists.mockResolvedValue(false);

      const result = await service.getUserExists('user-missing');

      expect(result).toBe(false);
    });

    it('should throw DATABASE_ERROR on a generic repository failure', async () => {
      mockRepository.exists.mockRejectedValue(new Error('Query failed'));

      await expect(service.getUserExists('user-1')).rejects.toMatchObject({
        code: 'DATABASE_ERROR',
      });
    });
  });
});
