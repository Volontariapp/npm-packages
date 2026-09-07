import { Injectable, Inject } from '@nestjs/common';
import { Logger } from '@volontariapp/logger';
import {
  DATABASE_ERROR,
  SOCIAL_RELATIONSHIP_ALREADY_EXISTS,
  SOCIAL_RELATIONSHIP_NOT_FOUND,
} from '@volontariapp/errors-nest';
import { isBaseError } from '@volontariapp/errors';
import { Neo4jInteractionRepository } from '../repositories/neo4j-interaction.repository.js';
import type { IInteractionRepository } from '../repositories/interfaces/interaction.repository.js';
import type { PaginatedIdsVO } from '../value-objects/paginated-ids.vo.js';

import { SocialUserMapper } from '../mappers/social-user.mapper.js';
import { SocialPostMapper } from '../mappers/social-post.mapper.js';
import { UserId, PostId } from '../value-objects/ids.vo.js';
import { PaginationVO } from '../value-objects/pagination.vo.js';

import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from '@volontariapp/database';
import { EventQueueEntity, EventQueueModel } from '@volontariapp/database';
import { EventQueueRepository } from '@volontariapp/outbox';
import {
  PostEventMessagingType,
  IPostLikedPayload,
  IPostUnlikedPayload,
} from '@volontariapp/messaging';
import { Streams } from '@volontariapp/shared';

@Injectable()
export class InteractionService {
  private readonly logger = new Logger({ context: InteractionService.name });

  constructor(
    @Inject(Neo4jInteractionRepository)
    private readonly repository: IInteractionRepository,
    @InjectRepository(EventQueueModel)
    private readonly eventQueueRepository: Repository<EventQueueModel>,
  ) {}

  async likePost(userId: UserId, postId: PostId): Promise<void> {
    const user = SocialUserMapper.toEntity(userId);
    const post = SocialPostMapper.toEntity(postId);
    try {
      this.logger.log(`Creating like: user ${userId.value} -> post ${postId.value}`);
      if (await this.repository.likeExists(user, post)) {
        throw SOCIAL_RELATIONSHIP_ALREADY_EXISTS(userId.value, postId.value, 'LIKE');
      }
      await this.repository.createLike(user, post);

      try {
        const payload: IPostLikedPayload = {
          postId: postId.value,
          authorId: userId.value,
        };
        const eventQueueEntity = EventQueueEntity.createEvent<PostEventMessagingType.POST_LIKED>({
          type: PostEventMessagingType.POST_LIKED,
          emitter: 'ms-social',
          emitterId: userId.value,
          payload,
          targetServices: [Streams.POST_LIKED],
        });
        const eventQueueRepo = new EventQueueRepository<PostEventMessagingType.POST_LIKED>(
          this.eventQueueRepository,
        );
        await eventQueueRepo.create(eventQueueEntity);
        this.logger.log(
          `Successfully pushed POST_LIKED event to outbox for user ${userId.value} -> post ${postId.value}`,
        );
      } catch (eventError: unknown) {
        this.logger.warn(
          `Failed to push POST_LIKED event to outbox: ${(eventError as Error).message}`,
        );
      }
    } catch (error: unknown) {
      if (isBaseError(error)) throw error;
      this.logger.error(
        `Failed to create like: ${userId.value} -> ${postId.value}`,
        error as Error,
      );
      throw DATABASE_ERROR('creating like relationship', (error as Error).message);
    }
  }

  async unlikePost(userId: UserId, postId: PostId): Promise<void> {
    const user = SocialUserMapper.toEntity(userId);
    const post = SocialPostMapper.toEntity(postId);
    try {
      this.logger.log(`Deleting like: user ${userId.value} -> post ${postId.value}`);
      if (!(await this.repository.likeExists(user, post))) {
        throw SOCIAL_RELATIONSHIP_NOT_FOUND(userId.value, postId.value, 'LIKE');
      }
      await this.repository.deleteLike(user, post);

      try {
        const payload: IPostUnlikedPayload = {
          postId: postId.value,
          authorId: userId.value,
        };
        const eventQueueEntity = EventQueueEntity.createEvent<PostEventMessagingType.POST_UNLIKED>({
          type: PostEventMessagingType.POST_UNLIKED,
          emitter: 'ms-social',
          emitterId: userId.value,
          payload,
          targetServices: [Streams.POST_UNLIKED],
        });
        const eventQueueRepo = new EventQueueRepository<PostEventMessagingType.POST_UNLIKED>(
          this.eventQueueRepository,
        );
        await eventQueueRepo.create(eventQueueEntity);
        this.logger.log(
          `Successfully pushed POST_UNLIKED event to outbox for user ${userId.value} -> post ${postId.value}`,
        );
      } catch (eventError: unknown) {
        this.logger.warn(
          `Failed to push POST_UNLIKED event to outbox: ${(eventError as Error).message}`,
        );
      }
    } catch (error: unknown) {
      if (isBaseError(error)) throw error;
      this.logger.error(
        `Failed to delete like: ${userId.value} -> ${postId.value}`,
        error as Error,
      );
      throw DATABASE_ERROR('deleting like relationship', (error as Error).message);
    }
  }

  async getUserLikes(userId: UserId, pagination: PaginationVO): Promise<PaginatedIdsVO> {
    const user = SocialUserMapper.toEntity(userId);
    try {
      return await this.repository.getUserLikes(user, pagination);
    } catch (error: unknown) {
      if (isBaseError(error)) throw error;
      this.logger.error(`Failed to get likes for user: ${userId.value}`, error as Error);
      throw DATABASE_ERROR('fetching user likes', (error as Error).message);
    }
  }

  async getPostLikers(postId: PostId, pagination: PaginationVO): Promise<PaginatedIdsVO> {
    const post = SocialPostMapper.toEntity(postId);
    try {
      return await this.repository.getPostLikers(post, pagination);
    } catch (error: unknown) {
      if (isBaseError(error)) throw error;
      this.logger.error(`Failed to get likers for post: ${postId.value}`, error as Error);
      throw DATABASE_ERROR('fetching post likers', (error as Error).message);
    }
  }
}
