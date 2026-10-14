import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import type { Repository } from '@volontariapp/database';
import {
  BaseRepository,
  ILike,
  In,
  PaginatedResult,
  EventQueueEntity,
  EventQueueModel,
} from '@volontariapp/database';
import { EventQueueRepository } from '@volontariapp/outbox';
import { Streams } from '@volontariapp/shared';
import { ForbiddenError } from '@volontariapp/errors';
import {
  PostEventMessagingType,
  IPostCreatedPayload,
  IPostDeletedPayload,
} from '@volontariapp/messaging';
import { PostModel, PostMediaModel, CommentModel } from '../models/index.js';
import { PostEntity } from '../entities/index.js';
import { PostMediaStatus, PostMediaScanStatus } from '../enums/index.js';
import type { IPostRepository, CreatePostWithMediaOptions } from './interfaces/index.js';

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

  async findById(
    id: string,
    relations: string[] = [],
    readerId?: string,
  ): Promise<PostEntity | null> {
    const post =
      relations.length > 0
        ? await this.findWithRelations({ id }, relations)
        : await super.findById(id);

    if (!post) return null;

    if (readerId && post.authorId === readerId) {
      return post;
    }

    if (post.media_status !== PostMediaStatus.NONE && post.media_status !== PostMediaStatus.READY) {
      return null;
    }

    return post;
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

  async search(searchTerm: string, readerIdOrFields?: string | string[]): Promise<PostEntity[]> {
    const readerId = typeof readerIdOrFields === 'string' ? readerIdOrFields : undefined;
    const posts = await super.find({
      where: { title: ILike(`%${searchTerm}%`) },
      relations: ['media'],
    });

    return posts.filter((post) => {
      if (readerId && post.authorId === readerId) return true;
      return (
        post.media_status === PostMediaStatus.NONE || post.media_status === PostMediaStatus.READY
      );
    });
  }

  async listPaginated(
    page: number,
    limit: number,
    authorId?: string,
    readerId?: string,
  ): Promise<PaginatedResult<PostEntity>> {
    if (authorId && readerId && authorId === readerId) {
      return super.paginate({ page, limit }, { where: { authorId }, relations: ['media'] });
    }

    const visibleStatuses = [PostMediaStatus.NONE, PostMediaStatus.READY];
    const qb = this.repository
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.media', 'media')
      .skip((page - 1) * limit)
      .take(limit)
      .orderBy('post.createdAt', 'DESC');

    if (authorId) {
      qb.andWhere('post.authorId = :authorId', { authorId });
    }

    if (!readerId) {
      qb.andWhere('post.media_status IN (:...visibleStatuses)', { visibleStatuses });
    } else {
      qb.andWhere('(post.authorId = :readerId OR post.media_status IN (:...visibleStatuses))', {
        readerId,
        visibleStatuses,
      });
    }

    const [items, total] = await qb.getManyAndCount();
    const entities = items.map((m) => this.toEntity(m));

    return {
      data: entities,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page * limit < total,
      hasPreviousPage: page > 1,
    };
  }

  async deleteByAuthorId(authorId: string): Promise<number> {
    const result = await super.deleteWhere({ authorId });
    return result.affected ?? 0;
  }

  async createWithPostCreated(
    data: Partial<PostEntity> & CreatePostWithMediaOptions,
  ): Promise<PostEntity> {
    return this.executeInTransaction(async (queryRunner) => {
      const postId = data.id ?? randomUUID();
      const authorId = data.authorId ?? '';
      const title = data.title ?? '';
      const content = data.content ?? '';
      const sagaStatus = data.saga_status ?? 'PENDING';
      const fileIds = data.fileIds ?? data.media?.map((m) => m.fileId) ?? [];

      let mediaStatus = data.media_status;
      if (!mediaStatus) {
        if (fileIds.length === 0) {
          mediaStatus = PostMediaStatus.NONE;
        } else if (data.fileScanStatuses) {
          const statuses = fileIds.map((fId) => data.fileScanStatuses?.[fId]);
          if (statuses.some((s) => s === PostMediaScanStatus.REJECTED)) {
            mediaStatus = PostMediaStatus.REJECTED;
          } else if (statuses.every((s) => s === PostMediaScanStatus.CLEAN)) {
            mediaStatus = PostMediaStatus.READY;
          } else {
            mediaStatus = PostMediaStatus.PENDING;
          }
        } else {
          mediaStatus = PostMediaStatus.PENDING;
        }
      }

      // Execute INSERT ... ON CONFLICT (id) DO NOTHING
      const insertResult = await queryRunner.manager
        .createQueryBuilder()
        .insert()
        .into(this.modelClass)
        .values({
          id: postId,
          authorId,
          title,
          content,
          saga_status: sagaStatus as PostModel['saga_status'],
          media_status: mediaStatus,
        })
        .orIgnore()
        .returning('*')
        .execute();

      const insertedRows = insertResult.raw as unknown as PostModel[];

      if (insertedRows.length === 0) {
        // Idempotency: post already created with this ID!
        const existingModel = await queryRunner.manager.findOne(this.modelClass, {
          where: { id: postId },
          relations: ['media'],
        });
        if (!existingModel) {
          throw new Error(`Post with id ${postId} failed to insert but was not found`);
        }
        if (existingModel.authorId !== authorId) {
          throw new ForbiddenError('You are not the author of this post');
        }
        return this.toEntity(existingModel);
      }

      // Insert media if any
      if (fileIds.length > 0) {
        const mediaValues = fileIds.map((fileId, index) => ({
          id: randomUUID(),
          postId,
          fileId,
          position: index,
          scanStatus: data.fileScanStatuses?.[fileId] ?? PostMediaScanStatus.AWAITING_UPLOAD,
        }));
        await queryRunner.manager
          .createQueryBuilder()
          .insert()
          .into(PostMediaModel)
          .values(mediaValues)
          .execute();
      }

      const finalModel = await queryRunner.manager.findOne(this.modelClass, {
        where: { id: postId },
        relations: ['media'],
      });
      const savedPostEntity = this.toEntity(finalModel ?? insertedRows[0]);

      const payload: IPostCreatedPayload = {
        postId: savedPostEntity.id,
        userId: savedPostEntity.authorId,
        fileIds,
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

  async updateMediaScanStatus(
    postId: string,
    fileId: string,
    scanStatus: PostMediaScanStatus,
  ): Promise<PostEntity | null> {
    return this.executeInTransaction(async (queryRunner) => {
      await queryRunner.manager
        .createQueryBuilder()
        .update(PostMediaModel)
        .set({ scanStatus })
        .where('post_id = :postId AND file_id = :fileId', { postId, fileId })
        .execute();

      const allMedia = await queryRunner.manager.find(PostMediaModel, {
        where: { postId },
      });

      let newMediaStatus = PostMediaStatus.NONE;
      if (allMedia.length > 0) {
        if (allMedia.some((m) => m.scanStatus === PostMediaScanStatus.REJECTED)) {
          newMediaStatus = PostMediaStatus.REJECTED;
        } else if (allMedia.every((m) => m.scanStatus === PostMediaScanStatus.CLEAN)) {
          newMediaStatus = PostMediaStatus.READY;
        } else {
          newMediaStatus = PostMediaStatus.PENDING;
        }
      }

      await queryRunner.manager
        .createQueryBuilder()
        .update(this.modelClass)
        .set({ media_status: newMediaStatus })
        .where('id = :postId', { postId })
        .execute();

      const updatedPost = await queryRunner.manager.findOne(this.modelClass, {
        where: { id: postId },
        relations: ['media'],
      });

      return updatedPost ? this.toEntity(updatedPost) : null;
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

  async purgePostsByAuthor(authorId: string): Promise<number> {
    return this.executeInTransaction(async (queryRunner) => {
      const posts = await queryRunner.manager.find(this.modelClass, {
        where: { authorId },
        select: ['id'],
      });
      const postIds = posts.map((p) => p.id);
      if (postIds.length > 0) {
        await queryRunner.manager.delete(CommentModel, { postId: In(postIds) });
        await queryRunner.manager.delete(PostMediaModel, { postId: In(postIds) });
        await queryRunner.manager.delete(this.modelClass, { authorId });
      }
      return postIds.length;
    });
  }
}
