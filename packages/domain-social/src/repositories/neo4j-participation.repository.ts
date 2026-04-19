import { PaginatedIdsVO } from '../value-objects/paginated-ids.vo.js';
import { SocialUserEntity } from '../entities/social-user.entity.js';
import { SocialEventEntity } from '../entities/social-event.entity.js';
import { PaginationVO } from '../value-objects/pagination.vo.js';
import { SocialUserMapper } from '../mappers/social-user.mapper.js';
import { SocialEventMapper } from '../mappers/social-event.mapper.js';
import type { IParticipationRepository } from '../repositories/interfaces/participation.repository.js';
import { Injectable, Inject } from '@nestjs/common';
import { NestNeo4jProvider, NEST_NEO4J_PROVIDER } from '@volontariapp/bridge-nest';
import { Neo4jBaseRepository } from './base/neo4j-base.repository.js';

@Injectable()
export class Neo4jParticipationRepository
  extends Neo4jBaseRepository
  implements IParticipationRepository
{
  constructor(
    @Inject(NEST_NEO4J_PROVIDER)
    provider: NestNeo4jProvider,
  ) {
    super(provider);
  }

  async createEventNode(entity: SocialEventEntity): Promise<void> {
    const model = SocialEventMapper.toModel(entity);
    await this.write('MERGE (e:SocialEvent {eventId: $eventId})', {
      eventId: model.id.value,
    });
  }

  async deleteEventNode(entity: SocialEventEntity): Promise<void> {
    const model = SocialEventMapper.toModel(entity);
    await this.write('MATCH (e:SocialEvent {eventId: $eventId}) DETACH DELETE e', {
      eventId: model.id.value,
    });
  }

  async eventExists(entity: SocialEventEntity): Promise<boolean> {
    const model = SocialEventMapper.toModel(entity);
    const result = await this.readOne(
      'MATCH (e:SocialEvent {eventId: $eventId}) RETURN e.eventId AS id',
      { eventId: model.id.value },
      (r) => r.get('id') as string,
    );
    return result !== null;
  }

  async createUserEvent(user: SocialUserEntity, event: SocialEventEntity): Promise<void> {
    const userModel = SocialUserMapper.toModel(user);
    const eventModel = SocialEventMapper.toModel(event);
    await this.write(
      `MATCH (u:SocialUser {userId: $userId})
       MATCH (e:SocialEvent {eventId: $eventId})
       MERGE (u)-[:CREATED]->(e)`,
      { userId: userModel.id.value, eventId: eventModel.id.value },
    );
  }

  async deleteUserEvent(user: SocialUserEntity, event: SocialEventEntity): Promise<void> {
    const userModel = SocialUserMapper.toModel(user);
    const eventModel = SocialEventMapper.toModel(event);
    await this.write(
      `MATCH (:SocialUser {userId: $userId})-[r:CREATED]->(:SocialEvent {eventId: $eventId})
       DELETE r`,
      { userId: userModel.id.value, eventId: eventModel.id.value },
    );
  }

  async createParticipation(user: SocialUserEntity, event: SocialEventEntity): Promise<void> {
    const userModel = SocialUserMapper.toModel(user);
    const eventModel = SocialEventMapper.toModel(event);
    await this.write(
      `MATCH (u:SocialUser {userId: $userId})
       MATCH (e:SocialEvent {eventId: $eventId})
       MERGE (u)-[:PARTICIPATE]->(e)`,
      { userId: userModel.id.value, eventId: eventModel.id.value },
    );
  }

  async deleteParticipation(user: SocialUserEntity, event: SocialEventEntity): Promise<void> {
    const userModel = SocialUserMapper.toModel(user);
    const eventModel = SocialEventMapper.toModel(event);
    await this.write(
      `MATCH (:SocialUser {userId: $userId})-[r:PARTICIPATE]->(:SocialEvent {eventId: $eventId})
       DELETE r`,
      { userId: userModel.id.value, eventId: eventModel.id.value },
    );
  }

  async participationExists(user: SocialUserEntity, event: SocialEventEntity): Promise<boolean> {
    const userModel = SocialUserMapper.toModel(user);
    const eventModel = SocialEventMapper.toModel(event);
    const result = await this.readOne(
      `MATCH (:SocialUser {userId: $userId})-[r:PARTICIPATE]->(:SocialEvent {eventId: $eventId})
       RETURN r`,
      { userId: userModel.id.value, eventId: eventModel.id.value },
      () => true,
    );
    return result === true;
  }

  async getUserEvents(user: SocialUserEntity, pagination: PaginationVO): Promise<PaginatedIdsVO> {
    const userModel = SocialUserMapper.toModel(user);
    return this.readPaginated(
      `MATCH (:SocialUser {userId: $userId})-[:CREATED]->(e:SocialEvent)
       RETURN e.eventId AS id
       SKIP $skip LIMIT $limit`,
      `MATCH (:SocialUser {userId: $userId})-[:CREATED]->(e:SocialEvent)
       RETURN count(e) AS total`,
      { userId: userModel.id.value },
      pagination,
    );
  }

  async getUserParticipations(
    user: SocialUserEntity,
    pagination: PaginationVO,
  ): Promise<PaginatedIdsVO> {
    const userModel = SocialUserMapper.toModel(user);
    return this.readPaginated(
      `MATCH (:SocialUser {userId: $userId})-[:PARTICIPATE]->(e:SocialEvent)
       RETURN e.eventId AS id
       SKIP $skip LIMIT $limit`,
      `MATCH (:SocialUser {userId: $userId})-[:PARTICIPATE]->(e:SocialEvent)
       RETURN count(e) AS total`,
      { userId: userModel.id.value },
      pagination,
    );
  }

  async getEventParticipants(
    event: SocialEventEntity,
    pagination: PaginationVO,
  ): Promise<PaginatedIdsVO> {
    const eventModel = SocialEventMapper.toModel(event);
    return this.readPaginated(
      `MATCH (u:SocialUser)-[:PARTICIPATE]->(:SocialEvent {eventId: $eventId})
       RETURN u.userId AS id
       SKIP $skip LIMIT $limit`,
      `MATCH (u:SocialUser)-[:PARTICIPATE]->(:SocialEvent {eventId: $eventId})
       RETURN count(u) AS total`,
      { eventId: eventModel.id.value },
      pagination,
    );
  }
}
