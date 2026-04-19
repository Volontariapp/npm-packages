import { Injectable, Inject } from '@nestjs/common';
import { Logger } from '@volontariapp/logger';
import { DATABASE_ERROR } from '@volontariapp/errors-nest';
import { isBaseError } from '@volontariapp/errors';
import { Neo4jEventPostLinkRepository } from '../repositories/neo4j-event-post-link.repository.js';
import type { IEventPostLinkRepository } from '../repositories/interfaces/event-post-link.repository.js';
import type { PaginatedIdsVO } from '../value-objects/paginated-ids.vo.js';
import { SocialPostMapper } from '../mappers/social-post.mapper.js';
import { SocialEventMapper } from '../mappers/social-event.mapper.js';
import { PostId, EventId } from '../value-objects/ids.vo.js';
import { PaginationVO } from '../value-objects/pagination.vo.js';

@Injectable()
export class EventPostLinkService {
  private readonly logger = new Logger({ context: EventPostLinkService.name });

  constructor(
    @Inject(Neo4jEventPostLinkRepository)
    private readonly repository: IEventPostLinkRepository,
  ) {}

  async linkPostToEvent(postId: PostId, eventId: EventId): Promise<void> {
    const post = SocialPostMapper.toEntity(postId);
    const event = SocialEventMapper.toEntity(eventId);
    try {
      this.logger.log(`Linking post ${postId.value} to event ${eventId.value}`);
      await this.repository.linkPostToEvent(post, event);
    } catch (error: unknown) {
      if (isBaseError(error)) throw error;
      this.logger.error(
        `Failed to link post ${postId.value} to event ${eventId.value}`,
        error as Error,
      );
      throw DATABASE_ERROR('linking post to event', (error as Error).message);
    }
  }

  async unlinkPostFromEvent(postId: PostId, eventId: EventId): Promise<void> {
    const post = SocialPostMapper.toEntity(postId);
    const event = SocialEventMapper.toEntity(eventId);
    try {
      this.logger.log(`Unlinking post ${postId.value} from event ${eventId.value}`);
      await this.repository.unlinkPostFromEvent(post, event);
    } catch (error: unknown) {
      if (isBaseError(error)) throw error;
      this.logger.error(
        `Failed to unlink post ${postId.value} from event ${eventId.value}`,
        error as Error,
      );
      throw DATABASE_ERROR('unlinking post from event', (error as Error).message);
    }
  }

  async getEventRelatedToPost(postId: PostId): Promise<string | null> {
    const post = SocialPostMapper.toEntity(postId);
    try {
      return await this.repository.getEventRelatedToPost(post);
    } catch (error: unknown) {
      if (isBaseError(error)) throw error;
      this.logger.error(`Failed to get event for post: ${postId.value}`, error as Error);
      throw DATABASE_ERROR('fetching event related to post', (error as Error).message);
    }
  }

  async getEventPosts(eventId: EventId, pagination: PaginationVO): Promise<PaginatedIdsVO> {
    const event = SocialEventMapper.toEntity(eventId);
    try {
      return await this.repository.getEventPosts(event, pagination);
    } catch (error: unknown) {
      if (isBaseError(error)) throw error;
      this.logger.error(`Failed to get posts for event: ${eventId.value}`, error as Error);
      throw DATABASE_ERROR('fetching event posts', (error as Error).message);
    }
  }
}
