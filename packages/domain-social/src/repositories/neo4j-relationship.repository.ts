import { Injectable, Inject } from '@nestjs/common';
import { NestNeo4jProvider, NEST_NEO4J_PROVIDER } from '@volontariapp/bridge-nest';
import { Neo4jBaseRepository } from './base/neo4j-base.repository.js';
import type { IRelationshipRepository } from './interfaces/relationship.repository.js';
import type { PaginatedIdsVO } from '../value-objects/paginated-ids.vo.js';
import { SocialUserEntity } from '../entities/social-user.entity.js';
import { SocialUserMapper } from '../mappers/social-user.mapper.js';
import { PaginationVO } from '../value-objects/pagination.vo.js';

@Injectable()
export class Neo4jRelationshipRepository
  extends Neo4jBaseRepository
  implements IRelationshipRepository
{
  constructor(
    @Inject(NEST_NEO4J_PROVIDER)
    provider: NestNeo4jProvider,
  ) {
    super(provider);
  }

  async createFollow(follower: SocialUserEntity, followed: SocialUserEntity): Promise<void> {
    const followerModel = SocialUserMapper.toModel(follower);
    const followedModel = SocialUserMapper.toModel(followed);
    await this.write(
      `MATCH (f:SocialUser {userId: $followerId})
       MATCH (t:SocialUser {userId: $followedId})
       MERGE (f)-[:FOLLOW]->(t)`,
      {
        followerId: followerModel.id.value,
        followedId: followedModel.id.value,
      },
    );
  }

  async deleteFollow(follower: SocialUserEntity, followed: SocialUserEntity): Promise<void> {
    const followerModel = SocialUserMapper.toModel(follower);
    const followedModel = SocialUserMapper.toModel(followed);
    await this.write(
      `MATCH (:SocialUser {userId: $followerId})-[r:FOLLOW]->(:SocialUser {userId: $followedId})
       DELETE r`,
      {
        followerId: followerModel.id.value,
        followedId: followedModel.id.value,
      },
    );
  }

  async createBlock(blocker: SocialUserEntity, blocked: SocialUserEntity): Promise<void> {
    const blockerModel = SocialUserMapper.toModel(blocker);
    const blockedModel = SocialUserMapper.toModel(blocked);
    await this.write(
      `MATCH (b:SocialUser {userId: $blockerId})
       MATCH (t:SocialUser {userId: $blockedId})
       MERGE (b)-[:BLOCK]->(t)`,
      {
        blockerId: blockerModel.id.value,
        blockedId: blockedModel.id.value,
      },
    );
  }

  async deleteBlock(blocker: SocialUserEntity, blocked: SocialUserEntity): Promise<void> {
    const blockerModel = SocialUserMapper.toModel(blocker);
    const blockedModel = SocialUserMapper.toModel(blocked);
    await this.write(
      `MATCH (:SocialUser {userId: $blockerId})-[r:BLOCK]->(:SocialUser {userId: $blockedId})
       DELETE r`,
      {
        blockerId: blockerModel.id.value,
        blockedId: blockedModel.id.value,
      },
    );
  }

  async getFollows(user: SocialUserEntity, pagination: PaginationVO): Promise<PaginatedIdsVO> {
    const model = SocialUserMapper.toModel(user);
    return this.readPaginated(
      `MATCH (:SocialUser {userId: $userId})-[:FOLLOW]->(u:SocialUser)
       RETURN u.userId AS id
       SKIP $skip LIMIT $limit`,
      `MATCH (:SocialUser {userId: $userId})-[:FOLLOW]->(u:SocialUser)
       RETURN count(u) AS total`,
      { userId: model.id.value },
      pagination,
    );
  }

  async getFollowers(user: SocialUserEntity, pagination: PaginationVO): Promise<PaginatedIdsVO> {
    const model = SocialUserMapper.toModel(user);
    return this.readPaginated(
      `MATCH (:SocialUser {userId: $userId})<-[:FOLLOW]-(u:SocialUser)
       RETURN u.userId AS id
       SKIP $skip LIMIT $limit`,
      `MATCH (:SocialUser {userId: $userId})<-[:FOLLOW]-(u:SocialUser)
       RETURN count(u) AS total`,
      { userId: model.id.value },
      pagination,
    );
  }

  async getBlocks(user: SocialUserEntity, pagination: PaginationVO): Promise<PaginatedIdsVO> {
    const model = SocialUserMapper.toModel(user);
    return this.readPaginated(
      `MATCH (:SocialUser {userId: $userId})-[:BLOCK]->(u:SocialUser)
       RETURN u.userId AS id
       SKIP $skip LIMIT $limit`,
      `MATCH (:SocialUser {userId: $userId})-[:BLOCK]->(u:SocialUser)
       RETURN count(u) AS total`,
      { userId: model.id.value },
      pagination,
    );
  }

  async getWhoBlockedMe(user: SocialUserEntity, pagination: PaginationVO): Promise<PaginatedIdsVO> {
    const model = SocialUserMapper.toModel(user);
    return this.readPaginated(
      `MATCH (:SocialUser {userId: $userId})<-[:BLOCK]-(u:SocialUser)
       RETURN u.userId AS id
       SKIP $skip LIMIT $limit`,
      `MATCH (:SocialUser {userId: $userId})<-[:BLOCK]-(u:SocialUser)
       RETURN count(u) AS total`,
      { userId: model.id.value },
      pagination,
    );
  }

  async relationshipExists(
    from: SocialUserEntity,
    to: SocialUserEntity,
    type: string,
  ): Promise<boolean> {
    const fromModel = SocialUserMapper.toModel(from);
    const toModel = SocialUserMapper.toModel(to);
    const result = await this.readOne(
      `MATCH (:SocialUser {userId: $fromId})-[r:${type}]->(:SocialUser {userId: $toId})
       RETURN r`,
      { fromId: fromModel.id.value, toId: toModel.id.value },
      () => true,
    );
    return result === true;
  }
}
