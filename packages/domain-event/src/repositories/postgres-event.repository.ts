import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from '@volontariapp/database';
import { BaseRepository } from '@volontariapp/database';
import { EventModel } from '../models/event.model.js';
import { EventEntity } from '../entities/event.entity.js';
import { IEventRepository } from './interfaces/event.repository.js';

@Injectable()
export class PostgresEventRepository
  extends BaseRepository<EventModel, EventEntity>
  implements IEventRepository
{
  constructor(
    @InjectRepository(EventModel)
    repository: Repository<EventModel>,
  ) {
    super(repository, EventEntity, EventModel);
  }
  findAll(): Promise<EventEntity[]> {
    return this.find();
  }
}
