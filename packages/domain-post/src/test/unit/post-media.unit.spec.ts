import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { PostService } from '../../services/post.service.js';
import { createPostRepositoryMock } from '../__test-utils__/mocks/post.repository.mock.js';
import { PostEntity } from '../../entities/post.entity.js';
import { PostMediaStatus, PostMediaScanStatus } from '../../enums/index.js';
import { POST_ALREADY_EXISTS, POST_NOT_FOUND } from '@volontariapp/errors-nest';

describe('PostService - Media & Idempotency (Unit)', () => {
  let service: PostService;
  let repoMock: ReturnType<typeof createPostRepositoryMock>;

  beforeEach(() => {
    repoMock = createPostRepositoryMock();
    service = new PostService(repoMock);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('create with media and provided id', () => {
    it('should create post with media and provided id', async () => {
      const postData: Partial<PostEntity> & { fileIds?: string[] } = {
        id: '11111111-1111-1111-1111-111111111111',
        authorId: 'author-1',
        title: 'Post with Media',
        content: 'Content',
        fileIds: ['file-1', 'file-2'],
      };

      const createdEntity = new PostEntity();
      createdEntity.id = postData.id ?? 'default-id';
      createdEntity.authorId = postData.authorId ?? 'default-author';
      createdEntity.title = postData.title ?? 'default-title';
      createdEntity.content = postData.content ?? 'default-content';
      createdEntity.media_status = PostMediaStatus.PENDING;

      const createSpy = jest
        .spyOn(repoMock, 'createWithPostCreated')
        .mockResolvedValue(createdEntity);

      const result = await service.create(postData);

      expect(createSpy).toHaveBeenCalledWith(postData);
      expect(result.id).toBe(postData.id);
      expect(result.media_status).toBe(PostMediaStatus.PENDING);
    });

    it('should throw POST_ALREADY_EXISTS with id if primary key conflicts on 23505', async () => {
      const error = Object.assign(new Error('Unique violation'), {
        code: '23505',
        detail: 'Key (id)=(11111111-1111-1111-1111-111111111111) already exists.',
      });
      const createSpy = jest.spyOn(repoMock, 'createWithPostCreated').mockRejectedValue(error);

      const input = {
        id: '11111111-1111-1111-1111-111111111111',
        title: 'Duplicate Post',
      };

      await expect(service.create(input)).rejects.toThrow(
        POST_ALREADY_EXISTS('id: 11111111-1111-1111-1111-111111111111'),
      );
      expect(createSpy).toHaveBeenCalledWith(input);
    });

    it('should throw POST_ALREADY_EXISTS with title if title conflicts on 23505', async () => {
      const error = Object.assign(new Error('Unique violation'), {
        code: '23505',
        detail: 'Key (title)=(Existing Title) already exists.',
      });
      const createSpy = jest.spyOn(repoMock, 'createWithPostCreated').mockRejectedValue(error);

      const input = {
        title: 'Existing Title',
      };

      await expect(service.create(input)).rejects.toThrow(POST_ALREADY_EXISTS('Existing Title'));
      expect(createSpy).toHaveBeenCalledWith(input);
    });
  });

  describe('updateMediaScanStatus', () => {
    it('should update media scan status successfully', async () => {
      const updatedPost = new PostEntity();
      updatedPost.id = 'post-1';
      updatedPost.media_status = PostMediaStatus.READY;

      const updateSpy = jest
        .spyOn(repoMock, 'updateMediaScanStatus')
        .mockResolvedValue(updatedPost);

      const result = await service.updateMediaScanStatus(
        'post-1',
        'file-1',
        PostMediaScanStatus.CLEAN,
      );

      expect(updateSpy).toHaveBeenCalledWith('post-1', 'file-1', PostMediaScanStatus.CLEAN);
      expect(result.media_status).toBe(PostMediaStatus.READY);
    });

    it('should throw POST_NOT_FOUND when post does not exist', async () => {
      const updateSpy = jest.spyOn(repoMock, 'updateMediaScanStatus').mockResolvedValue(null);

      await expect(
        service.updateMediaScanStatus('unknown', 'file-1', PostMediaScanStatus.CLEAN),
      ).rejects.toThrow(POST_NOT_FOUND('unknown'));
      expect(updateSpy).toHaveBeenCalledWith('unknown', 'file-1', PostMediaScanStatus.CLEAN);
    });
  });

  describe('findById with visibility filtering', () => {
    it('should pass readerId to repository findById', async () => {
      const post = new PostEntity();
      post.id = 'post-1';
      post.authorId = 'author-1';
      post.media_status = PostMediaStatus.PENDING;

      const findSpy = jest.spyOn(repoMock, 'findById').mockResolvedValue(post);

      const result = await service.findById('post-1', 'author-1');

      expect(findSpy).toHaveBeenCalledWith('post-1', ['media'], 'author-1');
      expect(result).toBe(post);
    });
  });
});
