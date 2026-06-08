import { Injectable, Inject } from '@nestjs/common';
import { NestNeo4jProvider, NEST_NEO4J_PROVIDER } from '@volontariapp/bridge-nest';
import { Neo4jBaseRepository } from './base/neo4j-base.repository.js';
import type { IPublicationRepository } from './interfaces/publication.repository.js';
import { PaginatedIdsVO } from '../value-objects/paginated-ids.vo.js';
import { SocialUserEntity } from '../entities/social-user.entity.js';
import { SocialPostEntity } from '../entities/social-post.entity.js';
import { SocialUserMapper } from '../mappers/social-user.mapper.js';
import { SocialPostMapper } from '../mappers/social-post.mapper.js';
import { PaginationVO } from '../value-objects/pagination.vo.js';

@Injectable()
export class Neo4jPublicationRepository
  extends Neo4jBaseRepository
  implements IPublicationRepository
{
  constructor(
    @Inject(NEST_NEO4J_PROVIDER)
    provider: NestNeo4jProvider,
  ) {
    super(provider);
  }

  async createPostNode(entity: SocialPostEntity): Promise<void> {
    const model = SocialPostMapper.toModel(entity);
    await this.write('MERGE (p:SocialPost {postId: $postId})', {
      postId: model.id.value,
    });
  }

  async createPostNodes(entities: SocialPostEntity[]): Promise<void> {
    if (entities.length === 0) return;
    const postIds = entities.map((entity) => SocialPostMapper.toModel(entity).id.value);
    await this.write(
      `UNWIND $postIds AS postId
       MERGE (p:SocialPost {postId: postId})`,
      { postIds },
    );
  }

  async deletePostNode(entity: SocialPostEntity): Promise<void> {
    const model = SocialPostMapper.toModel(entity);
    await this.write('MATCH (p:SocialPost {postId: $postId}) DETACH DELETE p', {
      postId: model.id.value,
    });
  }

  async deletePostNodes(entities: SocialPostEntity[]): Promise<void> {
    if (entities.length === 0) return;
    const postIds = entities.map((entity) => SocialPostMapper.toModel(entity).id.value);
    await this.write(
      `UNWIND $postIds AS postId
       MATCH (p:SocialPost {postId: postId})
       DETACH DELETE p`,
      { postIds },
    );
  }

  async postExists(entity: SocialPostEntity): Promise<boolean> {
    const model = SocialPostMapper.toModel(entity);
    const result = await this.readOne(
      'MATCH (p:SocialPost {postId: $postId}) RETURN p.postId AS id',
      { postId: model.id.value },
      (r) => r.get('id') as string,
    );
    return result !== null;
  }

  async createOwnership(userEntity: SocialUserEntity, postEntity: SocialPostEntity): Promise<void> {
    const userModel = SocialUserMapper.toModel(userEntity);
    const postModel = SocialPostMapper.toModel(postEntity);
    await this.write(
      `MATCH (u:SocialUser {userId: $userId})
       MATCH (p:SocialPost {postId: $postId})
       MERGE (u)-[:OWN]->(p)`,
      { userId: userModel.id.value, postId: postModel.id.value },
    );
  }

  async createOwnerships(
    pairs: { user: SocialUserEntity; post: SocialPostEntity }[],
  ): Promise<void> {
    if (pairs.length === 0) return;
    const batch = pairs.map((pair) => ({
      userId: SocialUserMapper.toModel(pair.user).id.value,
      postId: SocialPostMapper.toModel(pair.post).id.value,
    }));
    await this.write(
      `UNWIND $batch AS pair
       MATCH (u:SocialUser {userId: pair.userId})
       MATCH (p:SocialPost {postId: pair.postId})
       MERGE (u)-[:OWN]->(p)`,
      { batch },
    );
  }

  async createAndLinkPosts(
    pairs: { userId: string; postId: string; eventId?: string }[],
  ): Promise<{ invalidEventIds: { postId: string; eventId: string }[] }> {
    if (pairs.length === 0) return { invalidEventIds: [] };
    const batch = pairs.map((pair) => ({
      userId: pair.userId,
      postId: pair.postId,
      eventId: pair.eventId ?? null,
    }));

    const session = this.provider.getDriver().session();
    const invalidEventIds: { postId: string; eventId: string }[] = [];

    try {
      const result = await session.run(
        `UNWIND $batch AS item
         MERGE (p:SocialPost {postId: item.postId})
         WITH p, item
         MATCH (u:SocialUser {userId: item.userId})
         MERGE (u)-[:OWN]->(p)
         WITH p, item
         OPTIONAL MATCH (e:SocialEvent {eventId: item.eventId})
         FOREACH (ignored IN CASE WHEN e IS NOT NULL THEN [1] ELSE [] END |
           MERGE (p)-[:LINK_TO_EVENT]->(e)
         )
         RETURN item.postId AS postId, item.eventId AS eventId, e IS NOT NULL AS eventFound`,
        { batch },
      );

      for (const record of result.records) {
        const eventId = record.get('eventId') as string | null;
        const eventFound = record.get('eventFound') as boolean;

        if (eventId !== null && !eventFound) {
          invalidEventIds.push({
            postId: record.get('postId') as string,
            eventId,
          });
        }
      }
    } finally {
      await session.close();
    }

    return { invalidEventIds };
  }

  async deleteOwnership(userEntity: SocialUserEntity, postEntity: SocialPostEntity): Promise<void> {
    const userModel = SocialUserMapper.toModel(userEntity);
    const postModel = SocialPostMapper.toModel(postEntity);
    await this.write(
      `MATCH (:SocialUser {userId: $userId})-[r:OWN]->(:SocialPost {postId: $postId})
       DELETE r`,
      { userId: userModel.id.value, postId: postModel.id.value },
    );
  }

  async deleteOwnerships(
    pairs: { user: SocialUserEntity; post: SocialPostEntity }[],
  ): Promise<void> {
    if (pairs.length === 0) return;
    const batch = pairs.map((pair) => ({
      userId: SocialUserMapper.toModel(pair.user).id.value,
      postId: SocialPostMapper.toModel(pair.post).id.value,
    }));
    await this.write(
      `UNWIND $batch AS pair
       MATCH (:SocialUser {userId: pair.userId})-[r:OWN]->(:SocialPost {postId: pair.postId})
       DELETE r`,
      { batch },
    );
  }

  async getUserPosts(
    userEntity: SocialUserEntity,
    pagination: PaginationVO,
  ): Promise<PaginatedIdsVO> {
    const userModel = SocialUserMapper.toModel(userEntity);
    return this.readPaginated(
      `MATCH (:SocialUser {userId: $userId})-[:OWN]->(p:SocialPost)
       RETURN p.postId AS id
       SKIP $skip LIMIT $limit`,
      `MATCH (:SocialUser {userId: $userId})-[:OWN]->(p:SocialPost)
       RETURN count(p) AS total`,
      { userId: userModel.id.value },
      pagination,
    );
  }

  async getFeed(userEntity: SocialUserEntity, pagination: PaginationVO): Promise<PaginatedIdsVO> {
    const userModel = SocialUserMapper.toModel(userEntity);
    return this.readPaginated(
      `MATCH (:SocialUser {userId: $userId})-[:FOLLOW]->(followed:SocialUser)-[:OWN]->(p:SocialPost)
       RETURN DISTINCT p.postId AS id
       SKIP $skip LIMIT $limit`,
      `MATCH (:SocialUser {userId: $userId})-[:FOLLOW]->(followed:SocialUser)-[:OWN]->(p:SocialPost)
       RETURN count(DISTINCT p) AS total`,
      { userId: userModel.id.value },
      pagination,
    );
  }
}
