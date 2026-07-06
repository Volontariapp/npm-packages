import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from '@volontariapp/database';
import { BaseRepository, ILike, EventQueueEntity, EventQueueModel } from '@volontariapp/database';
import { EventQueueRepository } from '@volontariapp/outbox';
import { EventModel } from '../models/event.model.js';
import { EventEntity } from '../entities/event.entity.js';
import { Streams } from '@volontariapp/shared';
import { IEventRepository } from './interfaces/event.repository.js';
import {
  EventEventMessagingType,
  IEventCreatedPayload,
  IEventDeletedPayload,
} from '@volontariapp/messaging';
import { EventType, EventState } from '@volontariapp/contracts';
import { PaginatedEventsVO } from '../value-objects/paginated-events.value-object.js';
import { SearchAdvancedVO } from '../value-objects/search-advanced.value-object.js';

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

      const payload: IEventCreatedPayload = {
        eventId: savedEventEntity.id,
        localisationName: savedEventEntity.localisationName,
      };

      const eventQueueEntity: EventQueueEntity<
        EventEventMessagingType.EVENT_CREATED,
        IEventCreatedPayload
      > = EventQueueEntity.createEvent<EventEventMessagingType.EVENT_CREATED>({
        type: EventEventMessagingType.EVENT_CREATED,
        emitter: 'ms-event',
        emitterId: savedEventEntity.organizerId,
        payload,
        targetServices: [Streams.EVENT_CREATED],
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
      const model = await queryRunner.manager.findOne(this.modelClass, { where: { id } });
      const entity = model ? this.toEntity(model) : null;
      if (!entity) return false;

      await queryRunner.manager.delete(this.modelClass, id);

      const payload: IEventDeletedPayload = {
        eventId: entity.id,
      };

      const eventQueueEntity: EventQueueEntity<
        EventEventMessagingType.EVENT_DELETED,
        IEventDeletedPayload
      > = EventQueueEntity.createEvent<EventEventMessagingType.EVENT_DELETED>({
        type: EventEventMessagingType.EVENT_DELETED,
        emitter: 'ms-event',
        emitterId: entity.organizerId,
        payload,
        targetServices: [Streams.EVENT_DELETED],
      });

      const eventQueueRepo = new EventQueueRepository<EventEventMessagingType.EVENT_DELETED>(
        queryRunner.manager.getRepository<EventQueueModel>(EventQueueModel),
      );
      await eventQueueRepo.create(eventQueueEntity);

      return true;
    });
  }

  async findAroundMe(
    lat: number,
    lng: number,
    radiusInMeters: number,
    type?: EventType,
    state?: EventState,
  ): Promise<EventEntity[]> {
    const origin = `ST_SetSRID(ST_MakePoint(${String(lng)}, ${String(lat)}), 4326)`;

    const query = this.repository.createQueryBuilder('event');

    if (type !== undefined) {
      query.andWhere('event.type = :type', { type });
    }

    if (state !== undefined) {
      query.andWhere('event.state = :state', { state });
    }

    query.andWhere(`ST_DWithin(event.location::geography, ${origin}::geography, :radius)`);
    query.setParameter('radius', radiusInMeters);

    query.orderBy(`ST_Distance(event.location::geography, ${origin}::geography)`, 'ASC');

    const eventModels = await query.getMany();
    return eventModels.map((model) => this.toEntity(model));
  }

  async searchAdvanced(params: SearchAdvancedVO): Promise<PaginatedEventsVO> {
    const query = this.repository.createQueryBuilder('event');

    if (params.area) {
      const { lat, lng, radiusInMeters } = params.area;
      const origin = `ST_SetSRID(ST_MakePoint(${String(lng)}, ${String(lat)}), 4326)`;
      query.andWhere(`ST_DWithin(event.location::geography, ${origin}::geography, :radius)`);
      query.setParameter('radius', radiusInMeters);
      query.orderBy(`ST_Distance(event.location::geography, ${origin}::geography)`, 'ASC');
    } else {
      query.orderBy('event.createdAt', 'DESC');
    }

    if (params.types && params.types.length > 0) {
      query.andWhere('event.type IN (:...types)', { types: params.types });
    }

    if (params.statuses && params.statuses.length > 0) {
      query.andWhere('event.state IN (:...statuses)', { statuses: params.statuses });
    }

    if (params.searchTerm) {
      query.andWhere('event.name ILIKE :searchTerm', { searchTerm: `%${params.searchTerm}%` });
    }

    if (params.organizerId) {
      query.andWhere('event.organizerId = :organizerId', { organizerId: params.organizerId });
    }

    if (params.startDateFrom) {
      query.andWhere('event.startAt >= :startDateFrom', { startDateFrom: params.startDateFrom });
    }

    if (params.startDateTo) {
      query.andWhere('event.startAt <= :startDateTo', { startDateTo: params.startDateTo });
    }

    if (params.onlyAvailable) {
      query.andWhere('event.state = :availableState', {
        availableState: EventState.EVENT_STATE_PUBLISHED,
      });
    }

    if (params.ids && params.ids.length > 0) {
      query.andWhere('event.id IN (:...ids)', { ids: params.ids });
    }

    if (params.excludedIds && params.excludedIds.length > 0) {
      query.andWhere('event.id NOT IN (:...excludedIds)', { excludedIds: params.excludedIds });
    }

    if (params.tagSlugs && params.tagSlugs.length > 0) {
      query.leftJoin('event.tags', 'tag');
      query.andWhere('tag.slug IN (:...tagSlugs)', { tagSlugs: params.tagSlugs });
    }

    const page = params.page && params.page > 0 ? params.page : 1;
    const limit = params.limit && params.limit > 0 ? params.limit : 10;

    query.skip((page - 1) * limit);
    query.take(limit);

    const [models, total] = await query.getManyAndCount();

    return new PaginatedEventsVO(
      models.map((model) => this.toEntity(model)),
      total,
      page,
      limit,
    );
  }
}
