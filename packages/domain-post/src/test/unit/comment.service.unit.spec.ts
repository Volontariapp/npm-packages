import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { createMock } from '@volontariapp/testing';
import { CommentService } from '../../services/comment.service.js';
import { SagaStatus } from '@volontariapp/shared';
import type { ICommentRepository, IPostRepository } from '../../repositories/interfaces/index.js';
import { CommentFactory } from '../__test-utils__/factories/comment.factory.js';

describe('CommentService (Unit)', () => {
  let service: CommentService;
  let mockCommentRepository: jest.Mocked<ICommentRepository>;
  let mockPostRepository: jest.Mocked<IPostRepository>;

  beforeEach(() => {
    mockCommentRepository = createMock<ICommentRepository>();
    mockPostRepository = createMock<IPostRepository>();
    service = new CommentService(mockCommentRepository, mockPostRepository);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ─── updateSaga ───────────────────────────────────────────────────────────

  describe('updateSaga()', () => {
    it('should update the saga status and return the comment', async () => {
      // Arrange
      const comment = CommentFactory.build({ id: 'comment-1' });
      const updateSpy = jest.spyOn(mockCommentRepository, 'update').mockResolvedValue(comment);

      // Act
      const result = await service.updateSaga('comment-1', SagaStatus.DONE);

      // Assert
      expect(result).toEqual(comment);
      expect(updateSpy).toHaveBeenCalledWith('comment-1', { saga_status: SagaStatus.DONE });
    });

    it('should throw DATABASE_ERROR when repository.update returns null', async () => {
      // Arrange
      mockCommentRepository.update.mockResolvedValue(null);

      // Act + Assert
      await expect(service.updateSaga('unknown', SagaStatus.DONE)).rejects.toMatchObject({
        code: 'DATABASE_ERROR',
        message: expect.stringContaining('Comment not found'),
      });
    });

    it('should throw DATABASE_ERROR on repository failure', async () => {
      // Arrange
      mockCommentRepository.update.mockRejectedValue(new Error('Fail'));

      // Act + Assert
      await expect(service.updateSaga('comment-1', SagaStatus.DONE)).rejects.toMatchObject({
        code: 'DATABASE_ERROR',
      });
    });
  });
});
