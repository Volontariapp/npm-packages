import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { PostService } from '../../services/post.service.js';
import type { IPostRepository } from '../../repositories/interfaces/post.repository.js';
import { createPostRepositoryMock } from '../__test-utils__/mocks/post.repository.mock.js';
import { PostFactory } from '../__test-utils__/factories/post.factory.js';

describe('PostService (Unit)', () => {
  let service: PostService;
  let mockRepository: jest.Mocked<IPostRepository>;

  beforeEach(() => {
    mockRepository = createPostRepositoryMock();
    service = new PostService(mockRepository);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ─── findById ─────────────────────────────────────────────────────────────

  describe('findById()', () => {
    it('should return a post when it exists', async () => {
      // Arrange
      const post = PostFactory.build({ id: 'post-1' });
      const findByIdSpy = jest.spyOn(mockRepository, 'findById').mockResolvedValue(post);

      // Act
      const result = await service.findById('post-1');

      // Assert
      expect(result).toEqual(post);
      expect(findByIdSpy).toHaveBeenCalledWith('post-1');
    });

    it('should throw POST_NOT_FOUND when post does not exist', async () => {
      // Arrange
      jest.spyOn(mockRepository, 'findById').mockResolvedValue(null);

      // Act & Assert
      await expect(service.findById('unknown')).rejects.toMatchObject({
        code: 'NOT_FOUND',
      });
    });

    it('should rethrow BaseError from repository without wrapping', async () => {
      // Arrange
      const baseError = { isBaseError: true, code: 'SOME_ERROR' };
      jest.spyOn(mockRepository, 'findById').mockRejectedValue(baseError);

      // Act & Assert
      await expect(service.findById('post-1')).rejects.toEqual(baseError);
    });

    it('should throw DATABASE_ERROR on unexpected repository failure', async () => {
      // Arrange
      jest.spyOn(mockRepository, 'findById').mockRejectedValue(new Error('Unexpected'));

      // Act & Assert
      await expect(service.findById('post-1')).rejects.toMatchObject({
        code: 'DATABASE_ERROR',
      });
    });
  });

  // ─── findByAuthorId ───────────────────────────────────────────────────────

  describe('findByAuthorId()', () => {
    it('should return all posts for an author', async () => {
      // Arrange
      const posts = PostFactory.buildMany(2, { authorId: 'author-1' });
      const findByAuthorIdSpy = jest.spyOn(mockRepository, 'findByAuthorId').mockResolvedValue(posts);

      // Act
      const result = await service.findByAuthorId('author-1');

      // Assert
      expect(result).toEqual(posts);
      expect(findByAuthorIdSpy).toHaveBeenCalledWith('author-1');
    });

    it('should return an empty array if author has no posts', async () => {
      // Arrange
      jest.spyOn(mockRepository, 'findByAuthorId').mockResolvedValue([]);

      // Act
      const result = await service.findByAuthorId('author-none');

      // Assert
      expect(result).toEqual([]);
    });

    it('should throw DATABASE_ERROR on repository failure', async () => {
      // Arrange
      jest.spyOn(mockRepository, 'findByAuthorId').mockRejectedValue(new Error('DB Fail'));

      // Act & Assert
      await expect(service.findByAuthorId('author-1')).rejects.toMatchObject({
        code: 'DATABASE_ERROR',
      });
    });
  });

  // ─── findAll ──────────────────────────────────────────────────────────────

  describe('findAll()', () => {
    it('should return all posts', async () => {
      // Arrange
      const posts = PostFactory.buildMany(3);
      const findAllSpy = jest.spyOn(mockRepository, 'findAll').mockResolvedValue(posts);

      // Act
      const result = await service.findAll();

      // Assert
      expect(result).toEqual(posts);
      expect(findAllSpy).toHaveBeenCalled();
    });

    it('should throw DATABASE_ERROR on repository failure', async () => {
      // Arrange
      jest.spyOn(mockRepository, 'findAll').mockRejectedValue(new Error('DB Fail'));

      // Act & Assert
      await expect(service.findAll()).rejects.toMatchObject({
        code: 'DATABASE_ERROR',
      });
    });
  });

  // ─── create ───────────────────────────────────────────────────────────────

  describe('create()', () => {
    it('should create and return a new post', async () => {
      // Arrange
      const postData = { title: 'New Post', authorId: 'author-1' };
      const createdPost = PostFactory.build(postData);
      const createSpy = jest.spyOn(mockRepository, 'create').mockResolvedValue(createdPost);

      // Act
      const result = await service.create(postData);

      // Assert
      expect(result).toEqual(createdPost);
      expect(createSpy).toHaveBeenCalledWith(postData);
    });

    it('should throw POST_ALREADY_EXISTS on unique constraint violation (code 23505)', async () => {
      // Arrange
      const postData = { title: 'Duplicate' };
      const dbError = Object.assign(new Error('Duplicate'), { code: '23505' });
      jest.spyOn(mockRepository, 'create').mockRejectedValue(dbError);

      // Act & Assert
      await expect(service.create(postData)).rejects.toMatchObject({
        code: 'CONFLICT',
      });
    });

    it('should throw DATABASE_ERROR on other repository failures', async () => {
      // Arrange
      jest.spyOn(mockRepository, 'create').mockRejectedValue(new Error('Connection error'));

      // Act & Assert
      await expect(service.create({})).rejects.toMatchObject({
        code: 'DATABASE_ERROR',
      });
    });
  });

  // ─── update ───────────────────────────────────────────────────────────────

  describe('update()', () => {
    it('should update and return the post', async () => {
      // Arrange
      const updateData = { title: 'Updated' };
      const updatedPost = PostFactory.build(updateData);
      const updateSpy = jest.spyOn(mockRepository, 'update').mockResolvedValue(updatedPost);

      // Act
      const result = await service.update('post-1', updateData);

      // Assert
      expect(result).toEqual(updatedPost);
      expect(updateSpy).toHaveBeenCalledWith('post-1', updateData);
    });

    it('should throw POST_NOT_FOUND when post to update does not exist', async () => {
      // Arrange
      jest.spyOn(mockRepository, 'update').mockResolvedValue(null);

      // Act & Assert
      await expect(service.update('unknown', {})).rejects.toMatchObject({
        code: 'NOT_FOUND',
      });
    });

    it('should throw POST_ALREADY_EXISTS on unique constraint violation during update', async () => {
      // Arrange
      const dbError = Object.assign(new Error('Duplicate'), { code: '23505' });
      jest.spyOn(mockRepository, 'update').mockRejectedValue(dbError);

      // Act & Assert
      await expect(service.update('post-1', { title: 'Exists' })).rejects.toMatchObject({
        code: 'CONFLICT',
      });
    });
  });

  // ─── delete ───────────────────────────────────────────────────────────────

  describe('delete()', () => {
    it('should delete the post if it exists', async () => {
      // Arrange
      const post = PostFactory.build({ id: 'post-1' });
      const findByIdSpy = jest.spyOn(mockRepository, 'findById').mockResolvedValue(post);
      const deleteSpy = jest.spyOn(mockRepository, 'delete').mockResolvedValue(true);

      // Act
      await service.delete('post-1');

      // Assert
      expect(findByIdSpy).toHaveBeenCalledWith('post-1');
      expect(deleteSpy).toHaveBeenCalledWith('post-1');
    });

    it('should throw POST_NOT_FOUND if post to delete does not exist', async () => {
      // Arrange
      jest.spyOn(mockRepository, 'findById').mockResolvedValue(null);

      // Act & Assert
      await expect(service.delete('unknown')).rejects.toMatchObject({
        code: 'NOT_FOUND',
      });
    });

    it('should throw DATABASE_ERROR if repository.delete fails', async () => {
      // Arrange
      jest.spyOn(mockRepository, 'findById').mockResolvedValue(PostFactory.build());
      jest.spyOn(mockRepository, 'delete').mockRejectedValue(new Error('Fail'));

      // Act & Assert
      await expect(service.delete('post-1')).rejects.toMatchObject({
        code: 'DATABASE_ERROR',
      });
    });
  });

  // ─── deleteByAuthorId ─────────────────────────────────────────────────────

  describe('deleteByAuthorId()', () => {
    it('should return count of deleted posts', async () => {
      // Arrange
      const deleteByAuthorIdSpy = jest.spyOn(mockRepository, 'deleteByAuthorId').mockResolvedValue(5);

      // Act
      const result = await service.deleteByAuthorId('author-1');

      // Assert
      expect(result).toBe(5);
      expect(deleteByAuthorIdSpy).toHaveBeenCalledWith('author-1');
    });

    it('should throw DATABASE_ERROR on repository failure', async () => {
      // Arrange
      jest.spyOn(mockRepository, 'deleteByAuthorId').mockRejectedValue(new Error('Fail'));

      // Act & Assert
      await expect(service.deleteByAuthorId('author-1')).rejects.toMatchObject({
        code: 'DATABASE_ERROR',
      });
    });
  });
});
