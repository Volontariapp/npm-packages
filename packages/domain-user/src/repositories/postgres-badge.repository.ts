import { Injectable } from '@nestjs/common';
import { BaseRepository } from '@volontariapp/database';
import type { Repository } from '@volontariapp/database';
import { BadgeModel } from '../models/badge.model.js';
import { BadgeEntity } from '../entities/badge.entity.js';
import { IBadgeRepository } from './interfaces/badge.repository.js';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class PostgresBadgeRepository
  extends BaseRepository<BadgeModel, BadgeEntity>
  implements IBadgeRepository {
  constructor(@InjectRepository(BadgeModel) repository: Repository<BadgeModel>) {
    super(repository, BadgeEntity, BadgeModel);
  }
  async findManyByIds(ids: string[]): Promise<BadgeEntity[]> {
    return this.findByIds(ids);
  }
  async findBySlug(slug: string): Promise<BadgeEntity | null> {
    return this.findOne({ slug });
  }
  async findAll(): Promise<BadgeEntity[]> {
    return this.find();
  }

  }
