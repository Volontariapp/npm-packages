import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from '@volontariapp/database';
import { BaseRepository, ILike } from '@volontariapp/database';
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

  async findById(id: string, relations: string[] = []): Promise<EventEntity | null> {
    if (relations.length > 0) {
      return this.findWithRelations({ id }, relations);
    }
    return super.findById(id);
  }

  async findAll(relations: string[] = []): Promise<EventEntity[]> {
    if (relations.length > 0) {
      return super.findAllWithRelations(relations);
    }
    return super.find();
  }

  async search(searchTerm: string): Promise<EventEntity[]> {
    return super.find({ where: { name: ILike(`%${searchTerm}%`) } });
  }

  async createWithEventCreated(data: Partial<EventEntity>): Promise<EventEntity> {
    return this.executeInTransaction(async (queryRunner) => {
      const modelData = this.toModel(data);
      const eventModel = queryRunner.manager.create(this.modelClass, modelData);
      const savedEventModel = await queryRunner.manager.save(this.modelClass, eventModel);
      const savedEventEntity = this.toEntity(savedEventModel);

      const payload = { before: null, after: savedEventEntity };
      await queryRunner.manager.query(
        `INSERT INTO event_queue (type, emitter, "emitterId", payload, target_services, version, status, attempts, updated_at, created_at)
         VALUES ($1, $2, $3, $4, $5, 1, 'PENDING', 0, now(), now())`,
        [
          'event.created',
          'ms-event',
          savedEventEntity.organizerId,
          payload,
          ['social:interaction'],
        ],
      );

      return savedEventEntity;
    });
  }
}
