import { Injectable, Inject } from '@nestjs/common';
import { NestNeo4jProvider } from '@volontariapp/bridge-nest';
import { Neo4jBaseRepository } from './base/neo4j-base.repository.js';
import type { IEventPostLinkRepository } from './interfaces/event-post-link.repository.js';
import { PaginatedIdsVO } from '../value-objects/paginated-ids.vo.js';
import { SocialPostEntity } from '../entities/social-post.entity.js';
import { SocialEventEntity } from '../entities/social-event.entity.js';
import { SocialPostMapper } from '../mappers/social-post.mapper.js';
import { SocialEventMapper } from '../mappers/social-event.mapper.js';
import { PaginationVO } from '../value-objects/pagination.vo.js';

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

  async linkPostToEvent(
    postEntity: SocialPostEntity,
    eventEntity: SocialEventEntity,
  ): Promise<void> {
    const postModel = SocialPostMapper.toModel(postEntity);
    const eventModel = SocialEventMapper.toModel(eventEntity);
    await this.write(
      `MATCH (p:SocialPost {postId: $postId})
       MATCH (e:SocialEvent {eventId: $eventId})
       MERGE (p)-[:LINK_TO_EVENT]->(e)`,
      { postId: postModel.id.value, eventId: eventModel.id.value },
    );
  }

  async unlinkPostFromEvent(
    postEntity: SocialPostEntity,
    eventEntity: SocialEventEntity,
  ): Promise<void> {
    const postModel = SocialPostMapper.toModel(postEntity);
    const eventModel = SocialEventMapper.toModel(eventEntity);
    await this.write(
      `MATCH (:SocialPost {postId: $postId})-[r:LINK_TO_EVENT]->(:SocialEvent {eventId: $eventId})
       DELETE r`,
      { postId: postModel.id.value, eventId: eventModel.id.value },
    );
  }

  async getEventRelatedToPost(postEntity: SocialPostEntity): Promise<string | null> {
    const postModel = SocialPostMapper.toModel(postEntity);
    return this.readOne(
      `MATCH (:SocialPost {postId: $postId})-[:LINK_TO_EVENT]->(e:SocialEvent)
       RETURN e.eventId AS eventId`,
      { postId: postModel.id.value },
      (r) => r.get('eventId') as string,
    );
  }

  async getEventPosts(
    eventEntity: SocialEventEntity,
    pagination: PaginationVO,
  ): Promise<PaginatedIdsVO> {
    const eventModel = SocialEventMapper.toModel(eventEntity);
    return this.readPaginated(
      `MATCH (p:SocialPost)-[:LINK_TO_EVENT]->(:SocialEvent {eventId: $eventId})
       RETURN p.postId AS id
       SKIP $skip LIMIT $limit`,
      `MATCH (p:SocialPost)-[:LINK_TO_EVENT]->(:SocialEvent {eventId: $eventId})
       RETURN count(p) AS total`,
      { eventId: eventModel.id.value },
      pagination,
    );
  }
}
