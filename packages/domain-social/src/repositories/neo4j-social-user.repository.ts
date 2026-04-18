import { Injectable, Inject } from '@nestjs/common';
import { NestNeo4jProvider } from '@volontariapp/bridge-nest';
import { Neo4jBaseRepository } from './base/neo4j-base.repository.js';
import type { ISocialUserRepository } from './interfaces/social-user.repository.js';

@Injectable()
export class Neo4jSocialUserRepository
  extends Neo4jBaseRepository
  implements ISocialUserRepository
{
  constructor(
    @Inject(NestNeo4jProvider)
    provider: NestNeo4jProvider,
  ) {
    super(provider);
  }

  async createNode(userId: string): Promise<void> {
    await this.write('MERGE (u:SocialUser {userId: $userId})', { userId });
  }

  async deleteNode(userId: string): Promise<void> {
    await this.write('MATCH (u:SocialUser {userId: $userId}) DETACH DELETE u', { userId });
  }

  async exists(userId: string): Promise<boolean> {
    const result = await this.readOne(
      'MATCH (u:SocialUser {userId: $userId}) RETURN u.userId AS id',
      { userId },
      (r) => r.get('id') as string,
    );
    return result !== null;
  }
}
