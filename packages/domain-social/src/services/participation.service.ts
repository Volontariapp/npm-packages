import { Injectable, Inject } from '@nestjs/common';
import { Logger } from '@volontariapp/logger';
import {
  DATABASE_ERROR,
  SOCIAL_EVENT_NOT_FOUND,
  SOCIAL_EVENT_ALREADY_EXISTS,
  SOCIAL_PARTICIPATION_ALREADY_EXISTS,
  SOCIAL_PARTICIPATION_NOT_FOUND,
} from '@volontariapp/errors-nest';
import { isBaseError } from '@volontariapp/errors';
import { Neo4jParticipationRepository } from '../repositories/neo4j-participation.repository.js';
import type { IParticipationRepository } from '../repositories/interfaces/participation.repository.js';
import { SocialUserMapper } from '../mappers/social-user.mapper.js';
import { SocialEventMapper } from '../mappers/social-event.mapper.js';
import { UserId, EventId } from '../value-objects/ids.vo.js';
import { PaginationVO } from '../value-objects/pagination.vo.js';
import { PaginatedIdsVO } from '../index.js';

@Injectable()
export class ParticipationService {
  private readonly logger = new Logger({ context: ParticipationService.name });

  constructor(
    @Inject(Neo4jParticipationRepository)
    private readonly repository: IParticipationRepository,
  ) {}

  async createEvent(eventId: EventId): Promise<void> {
    const event = SocialEventMapper.toEntity(eventId);
    try {
      this.logger.log(`Creating social event node: ${eventId.value}`);
      if (await this.repository.eventExists(event)) {
        throw SOCIAL_EVENT_ALREADY_EXISTS(eventId.value);
      }
      await this.repository.createEventNode(event);
    } catch (error: unknown) {
      if (isBaseError(error)) throw error;
      this.logger.error(`Failed to create social event node: ${eventId.value}`, error as Error);
      throw DATABASE_ERROR('creating social event node', (error as Error).message);
    }
  }

  async deleteEvent(eventId: EventId): Promise<void> {
    const event = SocialEventMapper.toEntity(eventId);
    try {
      this.logger.log(`Deleting social event node: ${eventId.value}`);
      if (!(await this.repository.eventExists(event))) {
        throw SOCIAL_EVENT_NOT_FOUND(eventId.value);
      }
      await this.repository.deleteEventNode(event);
    } catch (error: unknown) {
      if (isBaseError(error)) throw error;
      this.logger.error(`Failed to delete social event node: ${eventId.value}`, error as Error);
      throw DATABASE_ERROR('deleting social event node', (error as Error).message);
    }
  }

  async getEventExists(eventId: EventId): Promise<boolean> {
    const event = SocialEventMapper.toEntity(eventId);
    try {
      return await this.repository.eventExists(event);
    } catch (error: unknown) {
      if (isBaseError(error)) throw error;
      this.logger.error(`Failed to check event existence: ${eventId.value}`, error as Error);
      throw DATABASE_ERROR('checking social event existence', (error as Error).message);
    }
  }

  async setEventCreator(userId: UserId, eventId: EventId): Promise<void> {
    const user = SocialUserMapper.toEntity(userId);
    const event = SocialEventMapper.toEntity(eventId);
    try {
      this.logger.log(`Setting event creator: user ${userId.value} -> event ${eventId.value}`);
      if (!(await this.repository.eventExists(event))) {
        throw SOCIAL_EVENT_NOT_FOUND(eventId.value);
      }
      await this.repository.createUserEvent(user, event);
    } catch (error: unknown) {
      if (isBaseError(error)) throw error;
      this.logger.error(
        `Failed to set event creator: ${userId.value} -> ${eventId.value}`,
        error as Error,
      );
      throw DATABASE_ERROR('setting event creator', (error as Error).message);
    }
  }

  async removeEventCreator(userId: UserId, eventId: EventId): Promise<void> {
    const user = SocialUserMapper.toEntity(userId);
    const event = SocialEventMapper.toEntity(eventId);
    try {
      this.logger.log(`Removing event creator: user ${userId.value} -> event ${eventId.value}`);
      if (!(await this.repository.eventExists(event))) {
        throw SOCIAL_EVENT_NOT_FOUND(eventId.value);
      }
      await this.repository.deleteUserEvent(user, event);
    } catch (error: unknown) {
      if (isBaseError(error)) throw error;
      this.logger.error(
        `Failed to remove event creator: ${userId.value} -> ${eventId.value}`,
        error as Error,
      );
      throw DATABASE_ERROR('removing event creator', (error as Error).message);
    }
  }

  async participateEvent(userId: UserId, eventId: EventId): Promise<void> {
    const user = SocialUserMapper.toEntity(userId);
    const event = SocialEventMapper.toEntity(eventId);
    try {
      this.logger.log(`Creating participation: user ${userId.value} -> event ${eventId.value}`);
      if (!(await this.repository.eventExists(event))) {
        throw SOCIAL_EVENT_NOT_FOUND(eventId.value);
      }
      if (await this.repository.participationExists(user, event)) {
        throw SOCIAL_PARTICIPATION_ALREADY_EXISTS(userId.value, eventId.value);
      }
      await this.repository.createParticipation(user, event);
    } catch (error: unknown) {
      if (isBaseError(error)) throw error;
      this.logger.error(
        `Failed to create participation: ${userId.value} -> ${eventId.value}`,
        error as Error,
      );
      throw DATABASE_ERROR('creating event participation', (error as Error).message);
    }
  }

  async leaveEvent(userId: UserId, eventId: EventId): Promise<void> {
    const user = SocialUserMapper.toEntity(userId);
    const event = SocialEventMapper.toEntity(eventId);
    try {
      this.logger.log(`Deleting participation: user ${userId.value} -> event ${eventId.value}`);
      if (!(await this.repository.eventExists(event))) {
        throw SOCIAL_EVENT_NOT_FOUND(eventId.value);
      }
      if (!(await this.repository.participationExists(user, event))) {
        throw SOCIAL_PARTICIPATION_NOT_FOUND(userId.value, eventId.value);
      }
      await this.repository.deleteParticipation(user, event);
    } catch (error: unknown) {
      if (isBaseError(error)) throw error;
      this.logger.error(
        `Failed to delete participation: ${userId.value} -> ${eventId.value}`,
        error as Error,
      );
      throw DATABASE_ERROR('deleting event participation', (error as Error).message);
    }
  }

  async getUserEvents(userId: UserId, pagination: PaginationVO): Promise<PaginatedIdsVO> {
    const user = SocialUserMapper.toEntity(userId);
    try {
      return await this.repository.getUserEvents(user, pagination);
    } catch (error: unknown) {
      if (isBaseError(error)) throw error;
      this.logger.error(`Failed to get events for user: ${userId.value}`, error as Error);
      throw DATABASE_ERROR('fetching user created events', (error as Error).message);
    }
  }

  async getUserParticipations(userId: UserId, pagination: PaginationVO): Promise<PaginatedIdsVO> {
    const user = SocialUserMapper.toEntity(userId);
    try {
      return await this.repository.getUserParticipations(user, pagination);
    } catch (error: unknown) {
      if (isBaseError(error)) throw error;
      this.logger.error(`Failed to get participations for user: ${userId.value}`, error as Error);
      throw DATABASE_ERROR('fetching user participations', (error as Error).message);
    }
  }

  async getEventParticipants(eventId: EventId, pagination: PaginationVO): Promise<PaginatedIdsVO> {
    const event = SocialEventMapper.toEntity(eventId);
    try {
      return await this.repository.getEventParticipants(event, pagination);
    } catch (error: unknown) {
      if (isBaseError(error)) throw error;
      this.logger.error(`Failed to get participants for event: ${eventId.value}`, error as Error);
      throw DATABASE_ERROR('fetching event participants', (error as Error).message);
    }
  }
}
