import { Injectable, Inject } from '@nestjs/common';
import { NestNeo4jProvider } from '@volontariapp/bridge-nest';
import type { PaginationRequest } from '@volontariapp/contracts';
import { Neo4jBaseRepository } from './base/neo4j-base.repository.js';
import type { IRelationshipRepository } from './interfaces/relationship.repository.js';
import type { PaginatedIds } from '../entities/paginated-ids.entity.js';

@Injectable()
export class Neo4jRelationshipRepository
  extends Neo4jBaseRepository
  implements IRelationshipRepository
{
  constructor(
    @Inject(NestNeo4jProvider)
    provider: NestNeo4jProvider,
  ) {
    super(provider);
  }

  async createFollow(followerId: string, followedId: string): Promise<void> {
    await this.write(
      `MATCH (f:SocialUser {userId: $followerId})
       MATCH (t:SocialUser {userId: $followedId})
       MERGE (f)-[:FOLLOW]->(t)`,
      { followerId, followedId },
    );
  }

  async deleteFollow(followerId: string, followedId: string): Promise<void> {
    await this.write(
      `MATCH (:SocialUser {userId: $followerId})-[r:FOLLOW]->(:SocialUser {userId: $followedId})
       DELETE r`,
      { followerId, followedId },
    );
  }

  async createBlock(blockerId: string, blockedId: string): Promise<void> {
    await this.write(
      `MATCH (b:SocialUser {userId: $blockerId})
       MATCH (t:SocialUser {userId: $blockedId})
       MERGE (b)-[:BLOCK]->(t)`,
      { blockerId, blockedId },
    );
  }

  async deleteBlock(blockerId: string, blockedId: string): Promise<void> {
    await this.write(
      `MATCH (:SocialUser {userId: $blockerId})-[r:BLOCK]->(:SocialUser {userId: $blockedId})
       DELETE r`,
      { blockerId, blockedId },
    );
  }

  async getFollows(userId: string, pagination: PaginationRequest): Promise<PaginatedIds> {
    return this.readPaginated(
      `MATCH (:SocialUser {userId: $userId})-[:FOLLOW]->(u:SocialUser)
       RETURN u.userId AS id
       SKIP $skip LIMIT $limit`,
      `MATCH (:SocialUser {userId: $userId})-[:FOLLOW]->(u:SocialUser)
       RETURN count(u) AS total`,
      { userId },
      pagination,
    );
  }

  async getFollowers(userId: string, pagination: PaginationRequest): Promise<PaginatedIds> {
    return this.readPaginated(
      `MATCH (:SocialUser {userId: $userId})<-[:FOLLOW]-(u:SocialUser)
       RETURN u.userId AS id
       SKIP $skip LIMIT $limit`,
      `MATCH (:SocialUser {userId: $userId})<-[:FOLLOW]-(u:SocialUser)
       RETURN count(u) AS total`,
      { userId },
      pagination,
    );
  }

  async getBlocks(userId: string, pagination: PaginationRequest): Promise<PaginatedIds> {
    return this.readPaginated(
      `MATCH (:SocialUser {userId: $userId})-[:BLOCK]->(u:SocialUser)
       RETURN u.userId AS id
       SKIP $skip LIMIT $limit`,
      `MATCH (:SocialUser {userId: $userId})-[:BLOCK]->(u:SocialUser)
       RETURN count(u) AS total`,
      { userId },
      pagination,
    );
  }

  async getWhoBlockedMe(userId: string, pagination: PaginationRequest): Promise<PaginatedIds> {
    return this.readPaginated(
      `MATCH (:SocialUser {userId: $userId})<-[:BLOCK]-(u:SocialUser)
       RETURN u.userId AS id
       SKIP $skip LIMIT $limit`,
      `MATCH (:SocialUser {userId: $userId})<-[:BLOCK]-(u:SocialUser)
       RETURN count(u) AS total`,
      { userId },
      pagination,
    );
  }
}
