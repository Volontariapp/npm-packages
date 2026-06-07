import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from '@volontariapp/database';
import { BaseRepository, ILike, PaginatedResult } from '@volontariapp/database';
import { PostModel } from '../models/index.js';
import { PostEntity } from '../entities/index.js';
import { IPostRepository } from './interfaces/index.js';

@Injectable()
export class PostgresPostRepository
  extends BaseRepository<PostModel, PostEntity>
  implements IPostRepository
{
  constructor(
    @InjectRepository(PostModel)
    repository: Repository<PostModel>,
  ) {
    super(repository, PostEntity, PostModel);
  }

  async findById(id: string, relations: string[] = []): Promise<PostEntity | null> {
    if (relations.length > 0) {
      return this.findWithRelations({ id }, relations);
    }
    return super.findById(id);
  }

  async findByAuthorId(authorId: string, relations: string[] = []): Promise<PostEntity[]> {
    return super.find({
      where: { authorId },
      relations,
    });
  }

  async findAll(relations: string[] = []): Promise<PostEntity[]> {
    if (relations.length > 0) {
      return super.findAllWithRelations(relations);
    }
    return super.find();
  }

  async search(searchTerm: string): Promise<PostEntity[]> {
    return super.find({ where: { title: ILike(`%${searchTerm}%`) } });
  }

  async listPaginated(
    page: number,
    limit: number,
    authorId?: string,
  ): Promise<PaginatedResult<PostEntity>> {
    const where = authorId ? { authorId } : undefined;
    return super.paginate({ page, limit }, { where });
  }

  async deleteByAuthorId(authorId: string): Promise<number> {
    const result = await super.deleteWhere({ authorId });
    return result.affected ?? 0;
  }
}
