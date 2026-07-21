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

  async createEventsBatch(events: { eventId: string; organizerId: string }[]): Promise<void> {
    await this.write(
      `UNWIND $events AS batch
       MERGE (e:SocialEvent {eventId: batch.eventId})
       WITH e, batch
       MATCH (u:SocialUser {userId: batch.organizerId})
       MERGE (u)-[:CREATED]->(e)`,
      { events },
    );
  }

  async deleteEventsBatch(eventIds: string[]): Promise<void> {
    await this.write(
      'MATCH (e:SocialEvent) WHERE e.eventId IN $eventIds DETACH DELETE e',
      { eventIds },
    );
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

  async createWish(user: SocialUserEntity, event: SocialEventEntity): Promise<void> {
    const userModel = SocialUserMapper.toModel(user);
    const eventModel = SocialEventMapper.toModel(event);
    await this.write(
      `MATCH (u:SocialUser {userId: $userId})
       MATCH (e:SocialEvent {eventId: $eventId})
       MERGE (u)-[:WISH_TO_PARTICIPATE]->(e)`,
      { userId: userModel.id.value, eventId: eventModel.id.value },
    );
  }

  async deleteWish(user: SocialUserEntity, event: SocialEventEntity): Promise<void> {
    const userModel = SocialUserMapper.toModel(user);
    const eventModel = SocialEventMapper.toModel(event);
    await this.write(
      `MATCH (:SocialUser {userId: $userId})-[r:WISH_TO_PARTICIPATE]->(:SocialEvent {eventId: $eventId})
       DELETE r`,
      { userId: userModel.id.value, eventId: eventModel.id.value },
    );
  }

  async wishExists(user: SocialUserEntity, event: SocialEventEntity): Promise<boolean> {
    const userModel = SocialUserMapper.toModel(user);
    const eventModel = SocialEventMapper.toModel(event);
    const result = await this.readOne(
      `MATCH (:SocialUser {userId: $userId})-[r:WISH_TO_PARTICIPATE]->(:SocialEvent {eventId: $eventId})
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

  async getUserWishes(user: SocialUserEntity, pagination: PaginationVO): Promise<PaginatedIdsVO> {
    const userModel = SocialUserMapper.toModel(user);
    return this.readPaginated(
      `MATCH (:SocialUser {userId: $userId})-[:WISH_TO_PARTICIPATE]->(e:SocialEvent)
       RETURN e.eventId AS id
       SKIP $skip LIMIT $limit`,
      `MATCH (:SocialUser {userId: $userId})-[:WISH_TO_PARTICIPATE]->(e:SocialEvent)
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

  async getRecommendedEventIds(
    userId: string,
    filters: {
      excludeCreatedByMe?: boolean;
      excludeBlockedUsers?: boolean;
      excludeParticipatedByMe?: boolean;
      excludeWishedByMe?: boolean;
      onlyParticipatedByFriends?: boolean;
      onlyWishedByFriends?: boolean;
      onlyCreatedByFriends?: boolean;
    },
    pagination: PaginationVO,
  ): Promise<PaginatedIdsVO> {
    const conditions: string[] = [];

    // The base match depends on whether we need to restrict to friends' events
    let baseMatch = 'MATCH (e:SocialEvent)';
    if (
      filters.onlyParticipatedByFriends ||
      filters.onlyWishedByFriends ||
      filters.onlyCreatedByFriends
    ) {
      // Find friends first (following each other)
      const relations = [];
      if (filters.onlyParticipatedByFriends) relations.push('PARTICIPATE');
      if (filters.onlyWishedByFriends) relations.push('WISH_TO_PARTICIPATE');
      if (filters.onlyCreatedByFriends) relations.push('CREATED');

      const relString = relations.join('|');
      baseMatch = `MATCH (u:SocialUser {userId: $userId})-[:FOLLOW]->(friend:SocialUser)-[:FOLLOW]->(u)
                   MATCH (friend)-[:${relString}]->(e:SocialEvent)`;
    } else {
      // Base case: we just consider all events
      baseMatch = 'MATCH (e:SocialEvent)';
    }

    if (filters.excludeCreatedByMe) {
      conditions.push('NOT EXISTS { MATCH (u)-[:CREATED]->(e) WHERE u.userId = $userId }');
    }
    if (filters.excludeParticipatedByMe) {
      conditions.push('NOT EXISTS { MATCH (u)-[:PARTICIPATE]->(e) WHERE u.userId = $userId }');
    }
    if (filters.excludeWishedByMe) {
      conditions.push(
        'NOT EXISTS { MATCH (u)-[:WISH_TO_PARTICIPATE]->(e) WHERE u.userId = $userId }',
      );
    }
    if (filters.excludeBlockedUsers) {
      // Event creator is not blocked by me and hasn't blocked me
      conditions.push(
        'NOT EXISTS { MATCH (:SocialUser {userId: $userId})-[:BLOCK]->(creator:SocialUser)-[:CREATED]->(e) }',
      );
      conditions.push(
        'NOT EXISTS { MATCH (creator:SocialUser)-[:BLOCK]->(:SocialUser {userId: $userId}) WHERE (creator)-[:CREATED]->(e) }',
      );
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Using distinct to avoid returning duplicates if multiple friends participated
    const matchQuery = `
      ${baseMatch}
      ${whereClause}
      WITH DISTINCT e
      RETURN e.eventId AS id
      SKIP $skip LIMIT $limit
    `;

    const countQuery = `
      ${baseMatch}
      ${whereClause}
      WITH DISTINCT e
      RETURN count(e) AS total
    `;

    return this.readPaginated(matchQuery, countQuery, { userId }, pagination);
  }
}
