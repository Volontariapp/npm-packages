import { Inject, Injectable } from '@nestjs/common';
import { Logger } from '@volontariapp/logger';
import {
  EVENT_NOT_FOUND,
  DATABASE_ERROR,
  TAG_NOT_FOUND,
  EVENT_ALREADY_EXISTS,
  INVALID_EVENT_STATE_TRANSITION,
  INVALID_DATE_PARAMETERS,
} from '@volontariapp/errors-nest';
import { isDatabaseDriverError, isBaseError } from '@volontariapp/errors';
import { EventState } from '@volontariapp/contracts';
import type { IEventRepository } from '../repositories/interfaces/event.repository.js';
import { PostgresEventRepository } from '../repositories/postgres-event.repository.js';
import { EventEntity } from '../entities/event.entity.js';
import { TagService } from './tag.service.js';
import { TagEntity } from '../entities/tag.entity.js';

@Injectable()
export class EventService {
  private readonly logger = new Logger({ context: EventService.name });

  constructor(
    @Inject(PostgresEventRepository)
    private readonly eventRepository: IEventRepository,
    private readonly tagService: TagService,
  ) {}

  async findById(id: string): Promise<EventEntity> {
    try {
      const event = await this.eventRepository.findById(id);
      if (!event) {
        throw EVENT_NOT_FOUND(id);
      }
      return event;
    } catch (error: unknown) {
      if (isBaseError(error)) throw error;
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

      if (data.startAt && data.endAt && data.startAt >= data.endAt) {
        throw INVALID_DATE_PARAMETERS('End date must be after start date');
      }

      if (data.tags && data.tags.length > 0) {
        data.tags = await this.validateTags(data.tags);
      }

      return await this.eventRepository.create(data);
    } catch (error: unknown) {
      if (isBaseError(error)) throw error;

      if (isDatabaseDriverError(error) && error.code === '23505') {
        throw EVENT_ALREADY_EXISTS(data.name ?? 'Unknown');
      }

      const err = error as Error;
      this.logger.error('Failed to create event', err);
      throw DATABASE_ERROR('creating event', err.message);
    }
  }

  async update(id: string, data: Partial<EventEntity>): Promise<EventEntity> {
    try {
      const existing = await this.findById(id);

      if (data.startAt || data.endAt) {
        const start = data.startAt ?? existing.startAt;
        const end = data.endAt ?? existing.endAt;
        if (start >= end) {
          throw INVALID_DATE_PARAMETERS('End date must be after start date');
        }
      }

      if (data.tags && data.tags.length > 0) {
        data.tags = await this.validateTags(data.tags);
      }

      const updated = await this.eventRepository.update(id, data);
      if (!updated) {
        throw EVENT_NOT_FOUND(id);
      }
      return updated;
    } catch (error: unknown) {
      if (isBaseError(error)) throw error;

      if (isDatabaseDriverError(error) && error.code === '23505') {
        throw EVENT_ALREADY_EXISTS(data.name ?? id);
      }

      const err = error as Error;
      this.logger.error(`Failed to update event: ${id}`, err);
      throw DATABASE_ERROR(`updating event: ${id}`, err.message);
    }
  }

  async changeState(id: string, state: EventState): Promise<EventEntity> {
    try {
      const event = await this.findById(id);

      if (event.state === state) {
        return event;
      }

      if (
        event.state === EventState.EVENT_STATE_CANCELLED &&
        state === EventState.EVENT_STATE_PUBLISHED
      ) {
        throw INVALID_EVENT_STATE_TRANSITION('CANCELLED', 'PUBLISHED');
      }

      this.logger.log(`Changing event state: ${id} -> ${String(state)}`);
      const merged = Object.assign(new EventEntity(), event, { state });
      const updated = await this.eventRepository.update(id, merged);
      if (!updated) {
        throw EVENT_NOT_FOUND(id);
      }
      return updated;
    } catch (error: unknown) {
      if (isBaseError(error)) throw error;
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
      if (isBaseError(error)) throw error;
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
      if (isBaseError(error)) throw error;
      const err = error as Error;
      this.logger.error(`Failed to search events: ${searchTerm}`, err);
      throw DATABASE_ERROR(`searching events: ${searchTerm}`, err.message);
    }
  }

  private async validateTags(tags: TagEntity[]): Promise<TagEntity[]> {
    const ids = tags.map((t) => t.id);
    const existingTags = await this.tagService.findByIds(ids);

    if (existingTags.length !== ids.length) {
      const existingIds = existingTags.map((t) => t.id);
      const missingId = ids.find((id) => !existingIds.includes(id));
      if (missingId !== undefined) {
        throw TAG_NOT_FOUND(missingId);
      }
    }

    return existingTags;
  }
}
