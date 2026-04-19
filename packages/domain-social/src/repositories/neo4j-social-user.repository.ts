import { Injectable, Inject } from '@nestjs/common';
import { NestNeo4jProvider, NEST_NEO4J_PROVIDER } from '@volontariapp/bridge-nest';
import { Neo4jBaseRepository } from './base/neo4j-base.repository.js';
import type { ISocialUserRepository } from './interfaces/social-user.repository.js';
import { SocialUserMapper } from '../mappers/social-user.mapper.js';
import { SocialUserEntity } from '../index.js';

@Injectable()
export class Neo4jSocialUserRepository
  extends Neo4jBaseRepository
  implements ISocialUserRepository
{
  constructor(
    @Inject(NEST_NEO4J_PROVIDER)
    provider: NestNeo4jProvider,
  ) {
    super(provider);
  }

  async createNode(entity: SocialUserEntity): Promise<void> {
    const model = SocialUserMapper.toModel(entity);
    await this.write('MERGE (u:SocialUser {userId: $userId})', {
      userId: model.id.value,
    });
  }

  async deleteNode(entity: SocialUserEntity): Promise<void> {
    const model = SocialUserMapper.toModel(entity);
    await this.write('MATCH (u:SocialUser {userId: $userId}) DETACH DELETE u', {
      userId: model.id.value,
    });
  }

  async exists(entity: SocialUserEntity): Promise<boolean> {
    const model = SocialUserMapper.toModel(entity);
    const result = await this.readOne(
      'MATCH (u:SocialUser {userId: $userId}) RETURN u.userId AS id',
      { userId: model.id.value },
      (r) => r.get('id') as string,
    );
    return result !== null;
  }
}
