import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from '@volontariapp/database';
import {
  BaseRepository,
  PaginatedResult,
  EventQueueEntity,
  EventQueueModel,
} from '@volontariapp/database';
import { EventQueueRepository } from '@volontariapp/outbox';
import { Streams } from '@volontariapp/shared';
import {
  PostEventMessagingType,
  ICommentCreatedPayload,
  ICommentDeletedPayload,
} from '@volontariapp/messaging';
import { CommentModel } from '../models/index.js';
import { CommentEntity } from '../entities/index.js';
import { ICommentRepository } from './interfaces/index.js';

@Injectable()
export class PostgresCommentRepository
  extends BaseRepository<CommentModel, CommentEntity>
  implements ICommentRepository
{
  constructor(
    @InjectRepository(CommentModel)
    repository: Repository<CommentModel>,
  ) {
    super(repository, CommentEntity, CommentModel);
  }

  async listPaginatedByPostId(
    postId: string,
    page: number,
    limit: number,
  ): Promise<PaginatedResult<CommentEntity>> {
    return super.paginate(
      { page, limit },
      {
        where: { postId },
        order: { createdAt: 'DESC' },
      },
    );
  }

  async createWithCommentCreated(data: Partial<CommentEntity>): Promise<CommentEntity> {
    return this.executeInTransaction(async (queryRunner) => {
      const modelData = this.toModel(data);
      const commentModel = queryRunner.manager.create(this.modelClass, modelData);
      const savedCommentModel = await queryRunner.manager.save(this.modelClass, commentModel);
      const savedCommentEntity = this.toEntity(savedCommentModel);

      const payload: ICommentCreatedPayload = {
        commentId: savedCommentEntity.id,
        postId: savedCommentEntity.postId,
        authorId: savedCommentEntity.authorId,
      };

      const eventQueueEntity = EventQueueEntity.createEvent<PostEventMessagingType.COMMENT_CREATED>(
        {
          type: PostEventMessagingType.COMMENT_CREATED,
          emitter: 'ms-post',
          emitterId: savedCommentEntity.authorId,
          payload,
          targetServices: [Streams.COMMENT_CREATED],
        },
      );

      const eventQueueRepo = new EventQueueRepository<PostEventMessagingType.COMMENT_CREATED>(
        queryRunner.manager.getRepository<EventQueueModel>(EventQueueModel),
      );
      await eventQueueRepo.create(eventQueueEntity);

      return savedCommentEntity;
    });
  }

  async deleteWithCommentDeleted(id: string): Promise<boolean> {
    return this.executeInTransaction(async (queryRunner) => {
      const model = await queryRunner.manager.findOne(this.modelClass, { where: { id } });
      const entity = model ? this.toEntity(model) : null;
      if (!entity) return false;

      await queryRunner.manager.delete(this.modelClass, id);

      const payload: ICommentDeletedPayload = {
        commentId: entity.id,
        postId: entity.postId,
      };

      const eventQueueEntity = EventQueueEntity.createEvent<PostEventMessagingType.COMMENT_DELETED>(
        {
          type: PostEventMessagingType.COMMENT_DELETED,
          emitter: 'ms-post',
          emitterId: entity.authorId,
          payload,
          targetServices: [Streams.COMMENT_DELETED],
        },
      );

      const eventQueueRepo = new EventQueueRepository<PostEventMessagingType.COMMENT_DELETED>(
        queryRunner.manager.getRepository<EventQueueModel>(EventQueueModel),
      );
      await eventQueueRepo.create(eventQueueEntity);

      return true;
    });
  }
}
