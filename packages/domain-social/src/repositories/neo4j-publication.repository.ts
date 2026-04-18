import { Injectable, Inject } from '@nestjs/common';
import { NestNeo4jProvider } from '@volontariapp/bridge-nest';
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
    @Inject(NestNeo4jProvider)
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

  async deletePostNode(entity: SocialPostEntity): Promise<void> {
    const model = SocialPostMapper.toModel(entity);
    await this.write('MATCH (p:SocialPost {postId: $postId}) DETACH DELETE p', {
      postId: model.id.value,
    });
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

  async deleteOwnership(userEntity: SocialUserEntity, postEntity: SocialPostEntity): Promise<void> {
    const userModel = SocialUserMapper.toModel(userEntity);
    const postModel = SocialPostMapper.toModel(postEntity);
    await this.write(
      `MATCH (:SocialUser {userId: $userId})-[r:OWN]->(:SocialPost {postId: $postId})
       DELETE r`,
      { userId: userModel.id.value, postId: postModel.id.value },
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
