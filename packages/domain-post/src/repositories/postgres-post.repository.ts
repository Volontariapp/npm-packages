import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from '@volontariapp/database';
import {
  BaseRepository,
  ILike,
  PaginatedResult,
  EventQueueEntity,
  EventQueueModel,
} from '@volontariapp/database';
import { EventQueueRepository } from '@volontariapp/outbox';
import { Streams } from '@volontariapp/shared';
import {
  PostEventMessagingType,
  IPostCreatedPayload,
  IPostDeletedPayload,
} from '@volontariapp/messaging';
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

  async createWithPostCreated(data: Partial<PostEntity>): Promise<PostEntity> {
    return this.executeInTransaction(async (queryRunner) => {
      const modelData = this.toModel(data);
      const postModel = queryRunner.manager.create(this.modelClass, modelData);
      const savedPostModel = await queryRunner.manager.save(this.modelClass, postModel);
      const savedPostEntity = this.toEntity(savedPostModel);

      const payload: IPostCreatedPayload = {
        postId: savedPostEntity.id,
      };

      if (data.eventId) {
        payload.eventId = data.eventId;
      }

      const eventQueueEntity = EventQueueEntity.createEvent<PostEventMessagingType.POST_CREATED>({
        type: PostEventMessagingType.POST_CREATED,
        emitter: 'ms-post',
        emitterId: savedPostEntity.authorId,
        payload,
        targetServices: [Streams.POST_CREATED],
      });

      const eventQueueRepo = new EventQueueRepository<PostEventMessagingType.POST_CREATED>(
        queryRunner.manager.getRepository<EventQueueModel>(EventQueueModel),
      );
      await eventQueueRepo.create(eventQueueEntity);

      return savedPostEntity;
    });
  }

  async deleteWithPostDeleted(id: string): Promise<boolean> {
    return this.executeInTransaction(async (queryRunner) => {
      const model = await queryRunner.manager.findOne(this.modelClass, { where: { id } });
      const entity = model ? this.toEntity(model) : null;
      if (!entity) return false;

      await queryRunner.manager.delete(this.modelClass, id);

      const payload: IPostDeletedPayload = {
        postId: entity.id,
      };

      const eventQueueEntity = EventQueueEntity.createEvent<PostEventMessagingType.POST_DELETED>({
        type: PostEventMessagingType.POST_DELETED,
        emitter: 'ms-post',
        emitterId: entity.authorId,
        payload,
        targetServices: [Streams.POST_DELETED],
      });

      const eventQueueRepo = new EventQueueRepository<PostEventMessagingType.POST_DELETED>(
        queryRunner.manager.getRepository<EventQueueModel>(EventQueueModel),
      );
      await eventQueueRepo.create(eventQueueEntity);

      return true;
    });
  }
}
