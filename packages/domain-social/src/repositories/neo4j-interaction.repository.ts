import { Injectable, Inject } from '@nestjs/common';
import { NestNeo4jProvider } from '@volontariapp/bridge-nest';
import { Neo4jBaseRepository } from './base/neo4j-base.repository.js';
import type { IInteractionRepository } from './interfaces/interaction.repository.js';
import { PaginatedIdsVO } from '../value-objects/paginated-ids.vo.js';
import { SocialUserEntity } from '../entities/social-user.entity.js';
import { SocialPostEntity } from '../entities/social-post.entity.js';
import { SocialUserMapper } from '../mappers/social-user.mapper.js';
import { SocialPostMapper } from '../mappers/social-post.mapper.js';
import { PaginationVO } from '../value-objects/pagination.vo.js';
import { PaginationMapper } from '../mappers/pagination.mapper.js';

@Injectable()
export class Neo4jInteractionRepository
  extends Neo4jBaseRepository
  implements IInteractionRepository
{
  constructor(
    @Inject(NestNeo4jProvider)
    provider: NestNeo4jProvider,
  ) {
    super(provider);
  }

  async createLike(userEntity: SocialUserEntity, postEntity: SocialPostEntity): Promise<void> {
    const userModel = SocialUserMapper.toModel(userEntity);
    const postModel = SocialPostMapper.toModel(postEntity);
    await this.write(
      `MATCH (u:SocialUser {userId: $userId})
       MATCH (p:SocialPost {postId: $postId})
       MERGE (u)-[:LIKE]->(p)`,
      { userId: userModel.id.value, postId: postModel.id.value },
    );
  }

  async deleteLike(userEntity: SocialUserEntity, postEntity: SocialPostEntity): Promise<void> {
    const userModel = SocialUserMapper.toModel(userEntity);
    const postModel = SocialPostMapper.toModel(postEntity);
    await this.write(
      `MATCH (:SocialUser {userId: $userId})-[r:LIKE]->(:SocialPost {postId: $postId})
       DELETE r`,
      { userId: userModel.id.value, postId: postModel.id.value },
    );
  }

  async getUserLikes(
    userEntity: SocialUserEntity,
    pagination: PaginationVO,
  ): Promise<PaginatedIdsVO> {
    const userModel = SocialUserMapper.toModel(userEntity);
    const paginationModel = PaginationMapper.toModel(pagination);
    return this.readPaginated(
      `MATCH (:SocialUser {userId: $userId})-[:LIKE]->(p:SocialPost)
       RETURN p.postId AS id
       SKIP $skip LIMIT $limit`,
      `MATCH (:SocialUser {userId: $userId})-[:LIKE]->(p:SocialPost)
       RETURN count(p) AS total`,
      { userId: userModel.id.value },
      paginationModel,
    );
  }

  async getPostLikers(
    postEntity: SocialPostEntity,
    pagination: PaginationVO,
  ): Promise<PaginatedIdsVO> {
    const postModel = SocialPostMapper.toModel(postEntity);
    return this.readPaginated(
      `MATCH (u:SocialUser)-[:LIKE]->(:SocialPost {postId: $postId})
       RETURN u.userId AS id
       SKIP $skip LIMIT $limit`,
      `MATCH (u:SocialUser)-[:LIKE]->(:SocialPost {postId: $postId})
       RETURN count(u) AS total`,
      { postId: postModel.id.value },
      pagination,
    );
  }

  async likeExists(userEntity: SocialUserEntity, postEntity: SocialPostEntity): Promise<boolean> {
    const userModel = SocialUserMapper.toModel(userEntity);
    const postModel = SocialPostMapper.toModel(postEntity);
    const result = await this.readOne(
      `MATCH (:SocialUser {userId: $userId})-[r:LIKE]->(:SocialPost {postId: $postId})
       RETURN r`,
      { userId: userModel.id.value, postId: postModel.id.value },
      () => true,
    );
    return result === true;
  }
}
