import { Injectable, Inject } from '@nestjs/common';
import { NestNeo4jProvider } from '@volontariapp/bridge-nest';
import type { PaginationRequest } from '@volontariapp/contracts';
import { Neo4jBaseRepository } from './base/neo4j-base.repository.js';
import type { IEventPostLinkRepository } from './interfaces/event-post-link.repository.js';
import type { PaginatedIds } from '../entities/paginated-ids.entity.js';

@Injectable()
export class Neo4jEventPostLinkRepository
  extends Neo4jBaseRepository
  implements IEventPostLinkRepository
{
  constructor(
    @Inject(NestNeo4jProvider)
    provider: NestNeo4jProvider,
  ) {
    super(provider);
  }

  async linkPostToEvent(postId: string, eventId: string): Promise<void> {
    await this.write(
      `MATCH (p:SocialPost {postId: $postId})
       MATCH (e:SocialEvent {eventId: $eventId})
       MERGE (p)-[:LINK_TO_EVENT]->(e)`,
      { postId, eventId },
    );
  }

  async unlinkPostFromEvent(postId: string, eventId: string): Promise<void> {
    await this.write(
      `MATCH (:SocialPost {postId: $postId})-[r:LINK_TO_EVENT]->(:SocialEvent {eventId: $eventId})
       DELETE r`,
      { postId, eventId },
    );
  }

  async getEventRelatedToPost(postId: string): Promise<string | null> {
    return this.readOne(
      `MATCH (:SocialPost {postId: $postId})-[:LINK_TO_EVENT]->(e:SocialEvent)
       RETURN e.eventId AS eventId`,
      { postId },
      (r) => r.get('eventId') as string,
    );
  }

  async getEventPosts(eventId: string, pagination: PaginationRequest): Promise<PaginatedIds> {
    return this.readPaginated(
      `MATCH (p:SocialPost)-[:LINK_TO_EVENT]->(:SocialEvent {eventId: $eventId})
       RETURN p.postId AS id
       SKIP $skip LIMIT $limit`,
      `MATCH (p:SocialPost)-[:LINK_TO_EVENT]->(:SocialEvent {eventId: $eventId})
       RETURN count(p) AS total`,
      { eventId },
      pagination,
    );
  }
}
