import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from '@volontariapp/database';
import { BaseRepository, PaginatedResult } from '@volontariapp/database';
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
