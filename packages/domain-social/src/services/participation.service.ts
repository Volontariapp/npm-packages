import { Injectable, Inject } from '@nestjs/common';
import { Logger } from '@volontariapp/logger';
import type { PaginationRequest } from '@volontariapp/contracts';
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
import type { PaginatedIds } from '../entities/paginated-ids.entity.js';

@Injectable()
export class ParticipationService {
  private readonly logger = new Logger({ context: ParticipationService.name });

  constructor(
    @Inject(Neo4jParticipationRepository)
    private readonly repository: IParticipationRepository,
  ) {}

  async createEvent(eventId: string): Promise<void> {
    try {
      this.logger.log(`Creating social event node: ${eventId}`);
      if (await this.repository.eventExists(eventId)) {
        throw SOCIAL_EVENT_ALREADY_EXISTS(eventId);
      }
      await this.repository.createEventNode(eventId);
    } catch (error: unknown) {
      if (isBaseError(error)) throw error;
      this.logger.error(`Failed to create social event node: ${eventId}`, error as Error);
      throw DATABASE_ERROR('creating social event node', (error as Error).message);
    }
  }

  async deleteEvent(eventId: string): Promise<void> {
    try {
      this.logger.log(`Deleting social event node: ${eventId}`);
      if (!(await this.repository.eventExists(eventId))) {
        throw SOCIAL_EVENT_NOT_FOUND(eventId);
      }
      await this.repository.deleteEventNode(eventId);
    } catch (error: unknown) {
      if (isBaseError(error)) throw error;
      this.logger.error(`Failed to delete social event node: ${eventId}`, error as Error);
      throw DATABASE_ERROR('deleting social event node', (error as Error).message);
    }
  }

  async getEventExists(eventId: string): Promise<boolean> {
    try {
      return await this.repository.eventExists(eventId);
    } catch (error: unknown) {
      if (isBaseError(error)) throw error;
      this.logger.error(`Failed to check event existence: ${eventId}`, error as Error);
      throw DATABASE_ERROR('checking social event existence', (error as Error).message);
    }
  }

  async setEventCreator(userId: string, eventId: string): Promise<void> {
    try {
      this.logger.log(`Setting event creator: user ${userId} -> event ${eventId}`);
      if (!(await this.repository.eventExists(eventId))) {
        throw SOCIAL_EVENT_NOT_FOUND(eventId);
      }
      await this.repository.createUserEvent(userId, eventId);
    } catch (error: unknown) {
      if (isBaseError(error)) throw error;
      this.logger.error(`Failed to set event creator: ${userId} -> ${eventId}`, error as Error);
      throw DATABASE_ERROR('setting event creator', (error as Error).message);
    }
  }

  async removeEventCreator(userId: string, eventId: string): Promise<void> {
    try {
      this.logger.log(`Removing event creator: user ${userId} -> event ${eventId}`);
      if (!(await this.repository.eventExists(eventId))) {
        throw SOCIAL_EVENT_NOT_FOUND(eventId);
      }
      await this.repository.deleteUserEvent(userId, eventId);
    } catch (error: unknown) {
      if (isBaseError(error)) throw error;
      this.logger.error(`Failed to remove event creator: ${userId} -> ${eventId}`, error as Error);
      throw DATABASE_ERROR('removing event creator', (error as Error).message);
    }
  }

  async participateEvent(userId: string, eventId: string): Promise<void> {
    try {
      this.logger.log(`Creating participation: user ${userId} -> event ${eventId}`);
      if (!(await this.repository.eventExists(eventId))) {
        throw SOCIAL_EVENT_NOT_FOUND(eventId);
      }
      if (await this.repository.participationExists(userId, eventId)) {
        throw SOCIAL_PARTICIPATION_ALREADY_EXISTS(userId, eventId);
      }
      await this.repository.createParticipation(userId, eventId);
    } catch (error: unknown) {
      if (isBaseError(error)) throw error;
      this.logger.error(`Failed to create participation: ${userId} -> ${eventId}`, error as Error);
      throw DATABASE_ERROR('creating event participation', (error as Error).message);
    }
  }

  async leaveEvent(userId: string, eventId: string): Promise<void> {
    try {
      this.logger.log(`Deleting participation: user ${userId} -> event ${eventId}`);
      if (!(await this.repository.eventExists(eventId))) {
        throw SOCIAL_EVENT_NOT_FOUND(eventId);
      }
      if (!(await this.repository.participationExists(userId, eventId))) {
        throw SOCIAL_PARTICIPATION_NOT_FOUND(userId, eventId);
      }
      await this.repository.deleteParticipation(userId, eventId);
    } catch (error: unknown) {
      if (isBaseError(error)) throw error;
      this.logger.error(`Failed to delete participation: ${userId} -> ${eventId}`, error as Error);
      throw DATABASE_ERROR('deleting event participation', (error as Error).message);
    }
  }

  async getUserEvents(userId: string, pagination: PaginationRequest): Promise<PaginatedIds> {
    try {
      return await this.repository.getUserEvents(userId, pagination);
    } catch (error: unknown) {
      if (isBaseError(error)) throw error;
      this.logger.error(`Failed to get events for user: ${userId}`, error as Error);
      throw DATABASE_ERROR('fetching user created events', (error as Error).message);
    }
  }

  async getUserParticipations(
    userId: string,
    pagination: PaginationRequest,
  ): Promise<PaginatedIds> {
    try {
      return await this.repository.getUserParticipations(userId, pagination);
    } catch (error: unknown) {
      if (isBaseError(error)) throw error;
      this.logger.error(`Failed to get participations for user: ${userId}`, error as Error);
      throw DATABASE_ERROR('fetching user participations', (error as Error).message);
    }
  }

  async getEventParticipants(
    eventId: string,
    pagination: PaginationRequest,
  ): Promise<PaginatedIds> {
    try {
      return await this.repository.getEventParticipants(eventId, pagination);
    } catch (error: unknown) {
      if (isBaseError(error)) throw error;
      this.logger.error(`Failed to get participants for event: ${eventId}`, error as Error);
      throw DATABASE_ERROR('fetching event participants', (error as Error).message);
    }
  }
}
