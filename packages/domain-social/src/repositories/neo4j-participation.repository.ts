import { Injectable, Inject } from '@nestjs/common';
import { NestNeo4jProvider } from '@volontariapp/bridge-nest';
import type { PaginationRequest } from '@volontariapp/contracts';
import { Neo4jBaseRepository } from './base/neo4j-base.repository.js';
import type { IParticipationRepository } from './interfaces/participation.repository.js';
import type { PaginatedIds } from '../entities/paginated-ids.entity.js';

@Injectable()
export class Neo4jParticipationRepository
  extends Neo4jBaseRepository
  implements IParticipationRepository
{
  constructor(
    @Inject(NestNeo4jProvider)
    provider: NestNeo4jProvider,
  ) {
    super(provider);
  }

  async createEventNode(eventId: string): Promise<void> {
    await this.write('MERGE (e:SocialEvent {eventId: $eventId})', { eventId });
  }

  async deleteEventNode(eventId: string): Promise<void> {
    await this.write('MATCH (e:SocialEvent {eventId: $eventId}) DETACH DELETE e', { eventId });
  }

  async eventExists(eventId: string): Promise<boolean> {
    const result = await this.readOne(
      'MATCH (e:SocialEvent {eventId: $eventId}) RETURN e.eventId AS id',
      { eventId },
      (r) => r.get('id') as string,
    );
    return result !== null;
  }

  async createUserEvent(userId: string, eventId: string): Promise<void> {
    await this.write(
      `MATCH (u:SocialUser {userId: $userId})
       MATCH (e:SocialEvent {eventId: $eventId})
       MERGE (u)-[:CREATED]->(e)`,
      { userId, eventId },
    );
  }

  async deleteUserEvent(userId: string, eventId: string): Promise<void> {
    await this.write(
      `MATCH (:SocialUser {userId: $userId})-[r:CREATED]->(:SocialEvent {eventId: $eventId})
       DELETE r`,
      { userId, eventId },
    );
  }

  async createParticipation(userId: string, eventId: string): Promise<void> {
    await this.write(
      `MATCH (u:SocialUser {userId: $userId})
       MATCH (e:SocialEvent {eventId: $eventId})
       MERGE (u)-[:PARTICIPATE]->(e)`,
      { userId, eventId },
    );
  }

  async deleteParticipation(userId: string, eventId: string): Promise<void> {
    await this.write(
      `MATCH (:SocialUser {userId: $userId})-[r:PARTICIPATE]->(:SocialEvent {eventId: $eventId})
       DELETE r`,
      { userId, eventId },
    );
  }

  async participationExists(userId: string, eventId: string): Promise<boolean> {
    const result = await this.readOne(
      `MATCH (:SocialUser {userId: $userId})-[r:PARTICIPATE]->(:SocialEvent {eventId: $eventId})
       RETURN r`,
      { userId, eventId },
      () => true,
    );
    return result === true;
  }

  async getUserEvents(userId: string, pagination: PaginationRequest): Promise<PaginatedIds> {
    return this.readPaginated(
      `MATCH (:SocialUser {userId: $userId})-[:CREATED]->(e:SocialEvent)
       RETURN e.eventId AS id
       SKIP $skip LIMIT $limit`,
      `MATCH (:SocialUser {userId: $userId})-[:CREATED]->(e:SocialEvent)
       RETURN count(e) AS total`,
      { userId },
      pagination,
    );
  }

  async getUserParticipations(
    userId: string,
    pagination: PaginationRequest,
  ): Promise<PaginatedIds> {
    return this.readPaginated(
      `MATCH (:SocialUser {userId: $userId})-[:PARTICIPATE]->(e:SocialEvent)
       RETURN e.eventId AS id
       SKIP $skip LIMIT $limit`,
      `MATCH (:SocialUser {userId: $userId})-[:PARTICIPATE]->(e:SocialEvent)
       RETURN count(e) AS total`,
      { userId },
      pagination,
    );
  }

  async getEventParticipants(
    eventId: string,
    pagination: PaginationRequest,
  ): Promise<PaginatedIds> {
    return this.readPaginated(
      `MATCH (u:SocialUser)-[:PARTICIPATE]->(:SocialEvent {eventId: $eventId})
       RETURN u.userId AS id
       SKIP $skip LIMIT $limit`,
      `MATCH (u:SocialUser)-[:PARTICIPATE]->(:SocialEvent {eventId: $eventId})
       RETURN count(u) AS total`,
      { eventId },
      pagination,
    );
  }
}
