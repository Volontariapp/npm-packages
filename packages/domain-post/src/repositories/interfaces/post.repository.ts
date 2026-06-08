import type { PaginatedResult } from '@volontariapp/database';
import type { PostEntity } from '../../entities/index.js';

export interface IPostRepository {
  findById(id: string): Promise<PostEntity | null>;
  findByAuthorId(id: string): Promise<PostEntity[]>;
  findAll(relations?: string[]): Promise<PostEntity[]>;
  create(event: Partial<PostEntity>): Promise<PostEntity>;
  createWithPostCreated(data: Partial<PostEntity>): Promise<PostEntity>;
  update(id: string, data: Partial<PostEntity>): Promise<PostEntity | null>;
  delete(id: string): Promise<boolean>;
  deleteWithPostDeleted(id: string): Promise<boolean>;
  deleteByAuthorId(authorId: string): Promise<number>;
  search(searchTerm: string): Promise<PostEntity[]>;
  listPaginated(
    page: number,
    limit: number,
    authorId?: string,
  ): Promise<PaginatedResult<PostEntity>>;
}
