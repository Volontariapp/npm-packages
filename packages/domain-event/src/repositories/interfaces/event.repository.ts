import type { EventEntity } from '../../entities/event.entity.js';
import type { EventType, EventState } from '@volontariapp/contracts';

export interface IEventRepository {
  findById(id: string, relations?: string[]): Promise<EventEntity | null>;
  findAll(relations?: string[]): Promise<EventEntity[]>;
  create(event: Partial<EventEntity>): Promise<EventEntity>;
  createWithEventCreated(event: Partial<EventEntity>): Promise<EventEntity>;
  update(id: string, data: Partial<EventEntity>): Promise<EventEntity | null>;
  delete(id: string): Promise<boolean>;
  deleteWithEventDeleted(id: string): Promise<boolean>;
  search(searchTerm: string): Promise<EventEntity[]>;
  findAroundMe(
    lat: number,
    lng: number,
    radiusInMeters: number,
    type?: EventType,
    state?: EventState,
  ): Promise<EventEntity[]>;
}
