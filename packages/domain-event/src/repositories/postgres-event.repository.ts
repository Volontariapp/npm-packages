import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import type { Repository } from '@volontariapp/database';
import { BaseRepository, ILike, EventQueueEntity, EventQueueModel } from '@volontariapp/database';
import { EventQueueRepository } from '@volontariapp/outbox';
import { ForbiddenError } from '@volontariapp/errors';
import { EventModel } from '../models/event.model.js';
import { EventEntity } from '../entities/event.entity.js';
import { Streams } from '@volontariapp/shared';
import { IEventRepository } from './interfaces/event.repository.js';
import {
  EventEventMessagingType,
  IEventCreatedPayload,
  IEventDeletedPayload,
  IEventFinishedPayload,
  IEventCoverReplacedPayload,
} from '@volontariapp/messaging';
import { EventType, EventState, CoverStatus } from '@volontariapp/contracts';
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
      const eventId = data.id ?? randomUUID();
      data.id = eventId;
      if (data.coverStatus === undefined) {
        data.coverStatus = data.coverFileId
          ? CoverStatus.COVER_STATUS_PENDING
          : CoverStatus.COVER_STATUS_NONE;
      }

      const modelData = this.toModel(data);
      modelData.id = eventId;

      const insertResult = await queryRunner.manager
        .createQueryBuilder()
        .insert()
        .into(this.modelClass)
        .values(modelData)
        .orIgnore()
        .returning('*')
        .execute();

      const insertedRows = insertResult.raw as EventModel[];

      if (insertedRows.length === 0) {
        const existing = await queryRunner.manager.findOne(this.modelClass, {
          where: { id: eventId },
          relations: ['tags', 'requirements'],
        });
        if (!existing) {
          throw new Error(`Event with id ${eventId} failed to insert but was not found`);
        }
        if (existing.organizerId !== data.organizerId) {
          throw new ForbiddenError('You are not the organizer of this event');
        }
        return this.toEntity(existing);
      }

      if (
        (data.tags && data.tags.length > 0) ||
        (data.requirements && data.requirements.length > 0)
      ) {
        const fullModel = queryRunner.manager.create(this.modelClass, modelData);
        fullModel.id = eventId;
        await queryRunner.manager.save(this.modelClass, fullModel);
      }

      const finalModel = await queryRunner.manager.findOne(this.modelClass, {
        where: { id: eventId },
        relations: ['tags', 'requirements'],
      });
      const savedEventEntity = this.toEntity(finalModel ?? insertedRows[0]);

      const payload: IEventCreatedPayload = {
        eventId: savedEventEntity.id,
        userId: savedEventEntity.organizerId,
        localisationName: savedEventEntity.localisationName,
        coverFileId: savedEventEntity.coverFileId ?? undefined,
      };

      const eventQueueEntity = EventQueueEntity.createEvent<EventEventMessagingType.EVENT_CREATED>({
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

  async updateCover(
    eventId: string,
    newCoverFileId: string | null,
    userId: string,
  ): Promise<EventEntity | null> {
    return this.executeInTransaction(async (queryRunner) => {
      const raw = await queryRunner.manager
        .createQueryBuilder(this.modelClass, 'event')
        .setLock('pessimistic_write')
        .where('event.id = :id', { id: eventId })
        .getOne();

      if (!raw) return null;

      const oldCoverFileId = raw.coverFileId ?? undefined;
      const normalizedNewFileId = newCoverFileId ?? undefined;

      if (oldCoverFileId === normalizedNewFileId) {
        return this.toEntity(raw);
      }

      const newCoverStatus = normalizedNewFileId
        ? CoverStatus.COVER_STATUS_PENDING
        : CoverStatus.COVER_STATUS_NONE;

      await queryRunner.manager
        .createQueryBuilder()
        .update(this.modelClass)
        .set({
          coverFileId: normalizedNewFileId ?? null,
          coverStatus: newCoverStatus,
        })
        .where('id = :id', { id: eventId })
        .execute();

      raw.coverFileId = normalizedNewFileId ?? null;
      raw.coverStatus = newCoverStatus;

      const payload: IEventCoverReplacedPayload = {
        eventId,
        userId,
        newFileId: normalizedNewFileId,
        oldFileId: oldCoverFileId,
      };

      const eventQueueEntity =
        EventQueueEntity.createEvent<EventEventMessagingType.EVENT_COVER_REPLACED>({
          type: EventEventMessagingType.EVENT_COVER_REPLACED,
          emitter: 'ms-event',
          emitterId: userId,
          payload,
          targetServices: [Streams.EVENT_COVER_REPLACED],
        });

      const eventQueueRepo = new EventQueueRepository<EventEventMessagingType.EVENT_COVER_REPLACED>(
        queryRunner.manager.getRepository<EventQueueModel>(EventQueueModel),
      );
      await eventQueueRepo.create(eventQueueEntity);

      return this.toEntity(raw);
    });
  }

  async applyCoverResult(
    eventId: string,
    fileId: string,
    status: CoverStatus,
  ): Promise<EventEntity | null> {
    return this.executeInTransaction(async (queryRunner) => {
      const event = await queryRunner.manager.findOne(this.modelClass, {
        where: { id: eventId },
      });

      if (!event) return null;

      if (event.coverFileId !== fileId) {
        return this.toEntity(event);
      }

      await queryRunner.manager
        .createQueryBuilder()
        .update(this.modelClass)
        .set({ coverStatus: status })
        .where('id = :id AND cover_file_id = :fileId', { id: eventId, fileId })
        .execute();

      event.coverStatus = status;
      return this.toEntity(event);
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

  async deleteAllByOrganizerWithEventDeleted(organizerId: string): Promise<number> {
    return this.executeInTransaction(async (queryRunner) => {
      const models = await queryRunner.manager.find(this.modelClass, {
        where: { organizerId },
      });
      if (models.length === 0) return 0;

      await queryRunner.manager.delete(this.modelClass, { organizerId });

      const eventQueueRepo = new EventQueueRepository<EventEventMessagingType.EVENT_DELETED>(
        queryRunner.manager.getRepository<EventQueueModel>(EventQueueModel),
      );

      for (const model of models) {
        const payload: IEventDeletedPayload = {
          eventId: model.id,
        };

        const eventQueueEntity: EventQueueEntity<
          EventEventMessagingType.EVENT_DELETED,
          IEventDeletedPayload
        > = EventQueueEntity.createEvent<EventEventMessagingType.EVENT_DELETED>({
          type: EventEventMessagingType.EVENT_DELETED,
          emitter: 'ms-event',
          emitterId: organizerId,
          payload,
          targetServices: [Streams.EVENT_DELETED],
        });

        await eventQueueRepo.create(eventQueueEntity);
      }

      return models.length;
    });
  }

  async changeStateWithEventFinished(id: string, state: EventState): Promise<EventEntity | null> {
    return this.executeInTransaction(async (queryRunner) => {
      const model = await queryRunner.manager.findOne(this.modelClass, { where: { id } });
      const entity = model ? this.toEntity(model) : null;
      if (!entity) return null;

      entity.state = state;
      const modelData = this.toModel(entity);
      const updatedModel = await queryRunner.manager.save(this.modelClass, modelData);
      const savedEntity = this.toEntity(updatedModel);

      const payload: IEventFinishedPayload = {
        eventId: savedEntity.id,
        eventType: savedEntity.type,
        awardedImpactScore: savedEntity.awardedImpactScore,
      };

      const eventQueueEntity: EventQueueEntity<
        EventEventMessagingType.EVENT_FINISHED,
        IEventFinishedPayload
      > = EventQueueEntity.createEvent<EventEventMessagingType.EVENT_FINISHED>({
        type: EventEventMessagingType.EVENT_FINISHED,
        emitter: 'ms-event',
        emitterId: savedEntity.organizerId,
        payload,
        targetServices: [Streams.EVENT_FINISHED],
      });

      const eventQueueRepo = new EventQueueRepository<EventEventMessagingType.EVENT_FINISHED>(
        queryRunner.manager.getRepository<EventQueueModel>(EventQueueModel),
      );
      await eventQueueRepo.create(eventQueueEntity);

      return savedEntity;
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
