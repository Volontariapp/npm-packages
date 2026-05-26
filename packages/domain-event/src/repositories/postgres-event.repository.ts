import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from '@volontariapp/database';
import { BaseRepository, ILike, EventQueueEntity, EventQueueModel } from '@volontariapp/database';
import { EventQueueRepository } from '@volontariapp/outbox';
import { EventModel } from '../models/event.model.js';
import { EventEntity } from '../entities/event.entity.js';
import { Streams } from '@volontariapp/shared';
import { IEventRepository } from './interfaces/event.repository.js';
import { EventEventMessagingType, IEventPayload } from '@volontariapp/messaging';

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

      const eventQueueEntity: EventQueueEntity<
        EventEventMessagingType.EVENT_CREATED,
        IEventPayload
      > = EventQueueEntity.createEvent<EventEventMessagingType.EVENT_CREATED>({
        type: EventEventMessagingType.EVENT_CREATED,
        emitter: 'ms-event',
        emitterId: savedEventEntity.organizerId ?? '',
        payload: savedEventEntity as IEventPayload,
        targetServices: [Streams.SOCIAL_INTERACTIONS],
      });

      const eventQueueRepo = new EventQueueRepository<EventEventMessagingType.EVENT_CREATED>(
        queryRunner.manager.getRepository<EventQueueModel>(EventQueueModel),
      );
      await eventQueueRepo.create(eventQueueEntity);

      return savedEventEntity;
    });
  }

  async deleteWithEventDeleted(id: string): Promise<boolean> {
    return this.executeInTransaction(async (queryRunner) => {
      const entity = await this.findById(id);
      if (!entity) return false;

      await queryRunner.manager.delete(this.modelClass, id);

      const eventQueueEntity: EventQueueEntity<
        EventEventMessagingType.EVENT_DELETED,
        IEventPayload
      > = EventQueueEntity.createEvent<EventEventMessagingType.EVENT_DELETED>({
        type: EventEventMessagingType.EVENT_DELETED,
        emitter: 'ms-event',
        emitterId: entity.organizerId ?? '',
        payload: entity as IEventPayload,
        targetServices: [Streams.SOCIAL_INTERACTIONS],
      });

      const eventQueueRepo = new EventQueueRepository<EventEventMessagingType.EVENT_DELETED>(
        queryRunner.manager.getRepository<EventQueueModel>(EventQueueModel),
      );
      await eventQueueRepo.create(eventQueueEntity);

      return true;
    });
  }
}
