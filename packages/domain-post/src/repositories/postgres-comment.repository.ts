import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from '@volontariapp/database';
import { BaseRepository, PaginatedResult, In } from '@volontariapp/database';
import { CommentModel } from '../models/index.js';
import { CommentEntity } from '../entities/index.js';
import { ICommentRepository } from './interfaces/index.js';

@Injectable()
export class PostgresCommentRepository
  extends BaseRepository<CommentModel, CommentEntity>
  implements ICommentRepository
{
  constructor(
    @InjectRepository(CommentModel)
    repository: Repository<CommentModel>,
  ) {
    super(repository, CommentEntity, CommentModel);
  }

  async deleteByPostId(postId: string): Promise<number> {
    const result = await super.deleteWhere({ postId });
    return result.affected ?? 0;
  }

  async deleteByPostIds(postIds: string[]): Promise<number> {
    if (postIds.length === 0) return 0;
    const result = await this.repository.delete({ postId: In(postIds) });
    return result.affected ?? 0;
  }

  async listPaginatedByPostId(
    postId: string,
    page: number,
    limit: number,
  ): Promise<PaginatedResult<CommentEntity>> {
    return super.paginate(
      { page, limit },
      {
        where: { postId },
        order: { createdAt: 'DESC' },
      },
    );
  }
}
