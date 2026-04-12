import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from '@volontariapp/database';
import { BaseRepository } from '@volontariapp/database';
import { RequirementModel } from '../models/requirement.model.js';
import { RequirementEntity } from '../entities/requirement.entity.js';
import { IRequirementRepository } from './interfaces/requirement.repository.js';

@Injectable()
export class PostgresRequirementRepository
  extends BaseRepository<RequirementModel, RequirementEntity>
  implements IRequirementRepository
{
  constructor(
    @InjectRepository(RequirementModel)
    repository: Repository<RequirementModel>,
  ) {
    super(repository, RequirementEntity, RequirementModel);
  }
  findAll(): Promise<RequirementEntity[]> {
    return this.find();
  }
}
