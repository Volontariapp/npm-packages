import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from '@volontariapp/database';
import { BaseRepository } from '@volontariapp/database';
import { TagModel } from '../models/tag.model.js';
import { TagEntity } from '../entities/tag.entity.js';
import { ITagRepository } from './interfaces/tag.repository.js';

@Injectable()
export class PostgresTagRepository
  extends BaseRepository<TagModel, TagEntity>
  implements ITagRepository
{
  constructor(
    @InjectRepository(TagModel)
    repository: Repository<TagModel>,
  ) {
    super(repository, TagEntity, TagModel);
  }

  async findBySlug(slug: string): Promise<TagEntity | null> {
    return this.findOne({ slug });
  }

  findAll(): Promise<TagEntity[]> {
    return this.find();
  }
}
