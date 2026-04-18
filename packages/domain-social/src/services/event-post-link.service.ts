import { Injectable, Inject } from '@nestjs/common';
import { Logger } from '@volontariapp/logger';
import type { PaginationRequest } from '@volontariapp/contracts';
import { DATABASE_ERROR } from '@volontariapp/errors-nest';
import { isBaseError } from '@volontariapp/errors';
import { Neo4jEventPostLinkRepository } from '../repositories/neo4j-event-post-link.repository.js';
import type { IEventPostLinkRepository } from '../repositories/interfaces/event-post-link.repository.js';
import type { PaginatedIds } from '../entities/paginated-ids.entity.js';

@Injectable()
export class EventPostLinkService {
  private readonly logger = new Logger({ context: EventPostLinkService.name });

  constructor(
    @Inject(Neo4jEventPostLinkRepository)
    private readonly repository: IEventPostLinkRepository,
  ) {}

  async linkPostToEvent(postId: string, eventId: string): Promise<void> {
    try {
      this.logger.log(`Linking post ${postId} to event ${eventId}`);
      await this.repository.linkPostToEvent(postId, eventId);
    } catch (error: unknown) {
      if (isBaseError(error)) throw error;
      this.logger.error(`Failed to link post ${postId} to event ${eventId}`, error as Error);
      throw DATABASE_ERROR('linking post to event', (error as Error).message);
    }
  }

  async unlinkPostFromEvent(postId: string, eventId: string): Promise<void> {
    try {
      this.logger.log(`Unlinking post ${postId} from event ${eventId}`);
      await this.repository.unlinkPostFromEvent(postId, eventId);
    } catch (error: unknown) {
      if (isBaseError(error)) throw error;
      this.logger.error(`Failed to unlink post ${postId} from event ${eventId}`, error as Error);
      throw DATABASE_ERROR('unlinking post from event', (error as Error).message);
    }
  }

  async getEventRelatedToPost(postId: string): Promise<string | null> {
    try {
      return await this.repository.getEventRelatedToPost(postId);
    } catch (error: unknown) {
      if (isBaseError(error)) throw error;
      this.logger.error(`Failed to get event for post: ${postId}`, error as Error);
      throw DATABASE_ERROR('fetching event related to post', (error as Error).message);
    }
  }

  async getEventPosts(eventId: string, pagination: PaginationRequest): Promise<PaginatedIds> {
    try {
      return await this.repository.getEventPosts(eventId, pagination);
    } catch (error: unknown) {
      if (isBaseError(error)) throw error;
      this.logger.error(`Failed to get posts for event: ${eventId}`, error as Error);
      throw DATABASE_ERROR('fetching event posts', (error as Error).message);
    }
  }
}
