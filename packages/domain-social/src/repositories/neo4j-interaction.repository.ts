import { Injectable, Inject } from '@nestjs/common';
import { NestNeo4jProvider } from '@volontariapp/bridge-nest';
import type { PaginationRequest } from '@volontariapp/contracts';
import { Neo4jBaseRepository } from './base/neo4j-base.repository.js';
import type { IInteractionRepository } from './interfaces/interaction.repository.js';
import type { PaginatedIds } from '../entities/paginated-ids.entity.js';

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

  async createLike(userId: string, postId: string): Promise<void> {
    await this.write(
      `MATCH (u:SocialUser {userId: $userId})
       MATCH (p:SocialPost {postId: $postId})
       MERGE (u)-[:LIKE]->(p)`,
      { userId, postId },
    );
  }

  async deleteLike(userId: string, postId: string): Promise<void> {
    await this.write(
      `MATCH (:SocialUser {userId: $userId})-[r:LIKE]->(:SocialPost {postId: $postId})
       DELETE r`,
      { userId, postId },
    );
  }

  async getUserLikes(userId: string, pagination: PaginationRequest): Promise<PaginatedIds> {
    return this.readPaginated(
      `MATCH (:SocialUser {userId: $userId})-[:LIKE]->(p:SocialPost)
       RETURN p.postId AS id
       SKIP $skip LIMIT $limit`,
      `MATCH (:SocialUser {userId: $userId})-[:LIKE]->(p:SocialPost)
       RETURN count(p) AS total`,
      { userId },
      pagination,
    );
  }

  async getPostLikers(postId: string, pagination: PaginationRequest): Promise<PaginatedIds> {
    return this.readPaginated(
      `MATCH (u:SocialUser)-[:LIKE]->(:SocialPost {postId: $postId})
       RETURN u.userId AS id
       SKIP $skip LIMIT $limit`,
      `MATCH (u:SocialUser)-[:LIKE]->(:SocialPost {postId: $postId})
       RETURN count(u) AS total`,
      { postId },
      pagination,
    );
  }

  async likeExists(userId: string, postId: string): Promise<boolean> {
    const result = await this.readOne(
      `MATCH (:SocialUser {userId: $userId})-[r:LIKE]->(:SocialPost {postId: $postId})
       RETURN r`,
      { userId, postId },
      () => true,
    );
    return result === true;
  }
}
