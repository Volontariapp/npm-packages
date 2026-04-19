import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { SocialUserService } from '../../services/social-user.service.js';
import type { ISocialUserRepository } from '../../repositories/interfaces/social-user.repository.js';
import { createSocialUserRepositoryMock } from '../__test-utils__/mocks/social-user.repository.mock.js';
import { UserIdFactory } from '../__test-utils__/factories/ids.factory.js';
import { SocialUserFactory } from '../__test-utils__/factories/social-user.factory.js';

describe('SocialUserService (Unit)', () => {
  let service: SocialUserService;
  let mockRepository: jest.Mocked<ISocialUserRepository>;

  beforeEach(() => {
    mockRepository = createSocialUserRepositoryMock();
    service = new SocialUserService(mockRepository);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ─── createUser ───────────────────────────────────────────────────────────

  describe('createUser()', () => {
    it('should call repository.createNode with the entity if user does not exist', async () => {
      const userId = UserIdFactory.build('user-1');
      const entity = SocialUserFactory.build({ userId: 'user-1' });
      const existsSpy = jest.spyOn(mockRepository, 'exists').mockResolvedValue(false);
      const createNodeSpy = jest.spyOn(mockRepository, 'createNode').mockResolvedValue(undefined);

      await service.createUser(userId);

      expect(existsSpy).toHaveBeenCalledWith(entity);
      expect(createNodeSpy).toHaveBeenCalledWith(entity);
    });

    it('should throw SOCIAL_USER_ALREADY_EXISTS if user already exists', async () => {
      const userId = UserIdFactory.build('user-1');
      jest.spyOn(mockRepository, 'exists').mockResolvedValue(true);
      const createNodeSpy = jest.spyOn(mockRepository, 'createNode');

      await expect(service.createUser(userId)).rejects.toMatchObject({ code: 'CONFLICT' });
      expect(createNodeSpy).not.toHaveBeenCalled();
    });

    it('should rethrow a BaseError without wrapping', async () => {
      const userId = UserIdFactory.build('user-1');
      jest.spyOn(mockRepository, 'exists').mockResolvedValue(false);
      jest.spyOn(mockRepository, 'createNode').mockRejectedValue({
        code: 'DATABASE_QUERY_ERROR',
        isBaseError: true,
      });

      await expect(service.createUser(userId)).rejects.toMatchObject({
        code: 'DATABASE_QUERY_ERROR',
        isBaseError: true,
      });
    });

    it('should throw DATABASE_ERROR on a generic repository failure', async () => {
      const userId = UserIdFactory.build('user-1');
      jest.spyOn(mockRepository, 'exists').mockResolvedValue(false);
      jest.spyOn(mockRepository, 'createNode').mockRejectedValue(new Error('Neo4j write failed'));

      await expect(service.createUser(userId)).rejects.toMatchObject({ code: 'DATABASE_ERROR' });
    });
  });

  // ─── deleteUser ───────────────────────────────────────────────────────────

  describe('deleteUser()', () => {
    it('should call repository.deleteNode with the entity if user exists', async () => {
      const userId = UserIdFactory.build('user-1');
      const entity = SocialUserFactory.build({ userId: 'user-1' });
      const existsSpy = jest.spyOn(mockRepository, 'exists').mockResolvedValue(true);
      const deleteNodeSpy = jest.spyOn(mockRepository, 'deleteNode').mockResolvedValue(undefined);

      await service.deleteUser(userId);

      expect(existsSpy).toHaveBeenCalledWith(entity);
      expect(deleteNodeSpy).toHaveBeenCalledWith(entity);
    });

    it('should throw SOCIAL_USER_NOT_FOUND if user does not exist', async () => {
      const userId = UserIdFactory.build('user-1');
      jest.spyOn(mockRepository, 'exists').mockResolvedValue(false);
      const deleteNodeSpy = jest.spyOn(mockRepository, 'deleteNode');

      await expect(service.deleteUser(userId)).rejects.toMatchObject({ code: 'NOT_FOUND' });
      expect(deleteNodeSpy).not.toHaveBeenCalled();
    });

    it('should rethrow a BaseError without wrapping', async () => {
      const userId = UserIdFactory.build('user-1');
      jest.spyOn(mockRepository, 'exists').mockResolvedValue(true);
      jest.spyOn(mockRepository, 'deleteNode').mockRejectedValue({
        code: 'NOT_FOUND',
        isBaseError: true,
      });

      await expect(service.deleteUser(userId)).rejects.toMatchObject({ isBaseError: true });
    });

    it('should throw DATABASE_ERROR on a generic repository failure', async () => {
      const userId = UserIdFactory.build('user-1');
      jest.spyOn(mockRepository, 'exists').mockResolvedValue(true);
      jest.spyOn(mockRepository, 'deleteNode').mockRejectedValue(new Error('Neo4j delete failed'));

      await expect(service.deleteUser(userId)).rejects.toMatchObject({ code: 'DATABASE_ERROR' });
    });
  });

  // ─── getUserExists ────────────────────────────────────────────────────────

  describe('getUserExists()', () => {
    it('should return true when the user node exists', async () => {
      const userId = UserIdFactory.build('user-1');
      const entity = SocialUserFactory.build({ userId: 'user-1' });
      const existsSpy = jest.spyOn(mockRepository, 'exists').mockResolvedValue(true);

      const result = await service.getUserExists(userId);

      expect(result).toBe(true);
      expect(existsSpy).toHaveBeenCalledWith(entity);
    });

    it('should return false when the user node does not exist', async () => {
      jest.spyOn(mockRepository, 'exists').mockResolvedValue(false);

      const result = await service.getUserExists(UserIdFactory.build('user-missing'));

      expect(result).toBe(false);
    });

    it('should throw DATABASE_ERROR on a generic repository failure', async () => {
      jest.spyOn(mockRepository, 'exists').mockRejectedValue(new Error('Query failed'));

      await expect(service.getUserExists(UserIdFactory.build('user-1'))).rejects.toMatchObject({
        code: 'DATABASE_ERROR',
      });
    });
  });
});
