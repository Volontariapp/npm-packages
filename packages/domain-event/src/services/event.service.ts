import { Inject, Injectable } from '@nestjs/common';
import { Logger } from '@volontariapp/logger';
import { EVENT_NOT_FOUND, DATABASE_ERROR } from '@volontariapp/errors-nest';
import { BaseError } from '@volontariapp/errors';
import { EventState } from '@volontariapp/contracts';
import type { IEventRepository } from '../repositories/interfaces/event.repository.js';
import { PostgresEventRepository } from '../repositories/postgres-event.repository.js';
import { EventEntity } from '../entities/event.entity.js';

@Injectable()
export class EventService {
  private readonly logger = new Logger({ context: EventService.name });

  constructor(
    @Inject(PostgresEventRepository)
    private readonly eventRepository: IEventRepository,
  ) {}

  async findById(id: string): Promise<EventEntity> {
    try {
      const event = await this.eventRepository.findById(id);
      if (!event) {
        throw EVENT_NOT_FOUND(id);
      }
      return event;
    } catch (error: unknown) {
      if (error instanceof BaseError) throw error;
      const err = error as Error;
      this.logger.error(`Failed to find event: ${id}`, err);
      throw DATABASE_ERROR(`finding event: ${id}`, err.message);
    }
  }

  async findAll(): Promise<EventEntity[]> {
    try {
      return await this.eventRepository.findAll();
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error('Failed to fetch events', err);
      throw DATABASE_ERROR('fetching all events', err.message);
    }
  }

  async create(data: Partial<EventEntity>): Promise<EventEntity> {
    try {
      this.logger.log(`Creating event: ${String(data.name)}`);
      return await this.eventRepository.create(data);
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error('Failed to create event', err);
      throw DATABASE_ERROR('creating event', err.message);
    }
  }

  async update(id: string, data: Partial<EventEntity>): Promise<EventEntity> {
    try {
      await this.findById(id);
      const updated = await this.eventRepository.update(id, data);
      if (!updated) {
        throw EVENT_NOT_FOUND(id);
      }
      return updated;
    } catch (error: unknown) {
      if (error instanceof BaseError) throw error;
      const err = error as Error;
      this.logger.error(`Failed to update event: ${id}`, err);
      throw DATABASE_ERROR(`updating event: ${id}`, err.message);
    }
  }

  async changeState(id: string, state: EventState): Promise<EventEntity> {
    try {
      const event = await this.findById(id);
      this.logger.log(`Changing event state: ${id} -> ${String(state)}`);
      const merged = Object.assign(new EventEntity(), event, { state });
      const updated = await this.eventRepository.update(id, merged);
      if (!updated) {
        throw EVENT_NOT_FOUND(id);
      }
      return updated;
    } catch (error: unknown) {
      if (error instanceof BaseError) throw error;
      const err = error as Error;
      this.logger.error(`Failed to change event state: ${id}`, err);
      throw DATABASE_ERROR(`changing event state: ${id}`, err.message);
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.findById(id);
      this.logger.log(`Deleting event: ${id}`);
      await this.eventRepository.delete(id);
    } catch (error: unknown) {
      if (error instanceof BaseError) throw error;
      const err = error as Error;
      this.logger.error(`Failed to delete event: ${id}`, err);
      throw DATABASE_ERROR(`deleting event: ${id}`, err.message);
    }
  }

  async search(searchTerm: string): Promise<EventEntity[]> {
    try {
      this.logger.debug(`Searching events with term: ${searchTerm}`);
      return await this.eventRepository.search(searchTerm);
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(`Failed to search events: ${searchTerm}`, err);
      throw DATABASE_ERROR(`searching events: ${searchTerm}`, err.message);
    }
  }
}
