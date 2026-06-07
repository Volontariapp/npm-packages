import type { PaginatedResult } from '@volontariapp/database';
import type { CommentEntity } from '../../entities/index.js';

export interface ICommentRepository {
  findById(id: string): Promise<CommentEntity | null>;
  create(data: Partial<CommentEntity>): Promise<CommentEntity>;
  delete(id: string): Promise<boolean>;
  listPaginatedByPostId(
    postId: string,
    page: number,
    limit: number,
  ): Promise<PaginatedResult<CommentEntity>>;
}
