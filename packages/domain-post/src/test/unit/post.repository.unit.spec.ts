import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { PostgresPostRepository } from '../../repositories/postgres-post.repository.js';
import type { PostModel } from '../../models/post.model.js';
import { registerPostMappings } from '../../models/mapper.js';
import type { Repository } from '@volontariapp/database';

describe('PostgresPostRepository (Unit)', () => {
  let repository: PostgresPostRepository;
  let mockTypeOrmRepo: jest.Mocked<Repository<PostModel>>;

  beforeEach(() => {
    registerPostMappings();
    
    mockTypeOrmRepo = {
      findOne: jest.fn(),
      findOneBy: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      metadata: {
        tableName: 'posts',
        name: 'PostModel',
        primaryColumns: [{ propertyName: 'id' }],
        columns: [],
        relations: [],
      },
    } as unknown as jest.Mocked<Repository<PostModel>>;

    repository = new PostgresPostRepository(mockTypeOrmRepo);
  });

  describe('findById()', () => {
    it('should call findOne with relations if provided', async () => {
      const id = 'post-1';
      const relations = ['author'];
      const findOneSpy = jest.spyOn(mockTypeOrmRepo, 'findOne').mockResolvedValue({ id } as PostModel);

      const result = await repository.findById(id, relations);

      expect(result?.id).toBe(id);
      expect(findOneSpy).toHaveBeenCalled();
    });

    it('should call super.findById if no relations provided', async () => {
      const id = 'post-1';
      const findOneBySpy = jest.spyOn(mockTypeOrmRepo, 'findOneBy').mockResolvedValue({ id } as PostModel);

      const result = await repository.findById(id);

      expect(result?.id).toBe(id);
      expect(findOneBySpy).toHaveBeenCalled();
    });
  });

  describe('findByAuthorId()', () => {
    it('should call find with authorId filter', async () => {
      const authorId = 'author-1';
      const findSpy = jest.spyOn(mockTypeOrmRepo, 'find').mockResolvedValue([]);

      await repository.findByAuthorId(authorId);

      expect(findSpy).toHaveBeenCalled();
    });
  });

  describe('findAll()', () => {
    it('should call find with relations if provided', async () => {
      const relations = ['comments'];
      const findSpy = jest.spyOn(mockTypeOrmRepo, 'find').mockResolvedValue([]);

      await repository.findAll(relations);

      expect(findSpy).toHaveBeenCalled();
    });

    it('should call super.find if no relations provided', async () => {
      const findSpy = jest.spyOn(mockTypeOrmRepo, 'find').mockResolvedValue([]);
      await repository.findAll();
      expect(findSpy).toHaveBeenCalled();
    });
  });

  describe('search()', () => {
    it('should call find with ILike pattern', async () => {
      const findSpy = jest.spyOn(mockTypeOrmRepo, 'find').mockResolvedValue([]);

      await repository.search('test');

      expect(findSpy).toHaveBeenCalled();
    });
  });

  describe('deleteByAuthorId()', () => {
    it('should call deleteWhere with authorId and return affected count', async () => {
      const authorId = 'author-1';
      const deleteSpy = jest.spyOn(mockTypeOrmRepo, 'delete').mockResolvedValue({ affected: 3, raw: [] });

      const result = await repository.deleteByAuthorId(authorId);

      expect(result).toBe(3);
      expect(deleteSpy).toHaveBeenCalled();
    });
  });
});
