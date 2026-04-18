import { Injectable, Inject } from '@nestjs/common';
import { NestNeo4jProvider } from '@volontariapp/bridge-nest';
import type { PaginationRequest } from '@volontariapp/contracts';
import { Neo4jBaseRepository } from './base/neo4j-base.repository.js';
import type { IPublicationRepository } from './interfaces/publication.repository.js';
import type { PaginatedIds } from '../entities/paginated-ids.entity.js';

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

  async createPostNode(postId: string): Promise<void> {
    await this.write('MERGE (p:SocialPost {postId: $postId})', { postId });
  }

  async deletePostNode(postId: string): Promise<void> {
    await this.write('MATCH (p:SocialPost {postId: $postId}) DETACH DELETE p', { postId });
  }

  async postExists(postId: string): Promise<boolean> {
    const result = await this.readOne(
      'MATCH (p:SocialPost {postId: $postId}) RETURN p.postId AS id',
      { postId },
      (r) => r.get('id') as string,
    );
    return result !== null;
  }

  async createOwnership(userId: string, postId: string): Promise<void> {
    await this.write(
      `MATCH (u:SocialUser {userId: $userId})
       MATCH (p:SocialPost {postId: $postId})
       MERGE (u)-[:OWN]->(p)`,
      { userId, postId },
    );
  }

  async deleteOwnership(userId: string, postId: string): Promise<void> {
    await this.write(
      `MATCH (:SocialUser {userId: $userId})-[r:OWN]->(:SocialPost {postId: $postId})
       DELETE r`,
      { userId, postId },
    );
  }

  async getUserPosts(userId: string, pagination: PaginationRequest): Promise<PaginatedIds> {
    return this.readPaginated(
      `MATCH (:SocialUser {userId: $userId})-[:OWN]->(p:SocialPost)
       RETURN p.postId AS id
       SKIP $skip LIMIT $limit`,
      `MATCH (:SocialUser {userId: $userId})-[:OWN]->(p:SocialPost)
       RETURN count(p) AS total`,
      { userId },
      pagination,
    );
  }

  async getFeed(userId: string, pagination: PaginationRequest): Promise<PaginatedIds> {
    return this.readPaginated(
      `MATCH (:SocialUser {userId: $userId})-[:FOLLOW]->(followed:SocialUser)-[:OWN]->(p:SocialPost)
       RETURN DISTINCT p.postId AS id
       SKIP $skip LIMIT $limit`,
      `MATCH (:SocialUser {userId: $userId})-[:FOLLOW]->(followed:SocialUser)-[:OWN]->(p:SocialPost)
       RETURN count(DISTINCT p) AS total`,
      { userId },
      pagination,
    );
  }
}
