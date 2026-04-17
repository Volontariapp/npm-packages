import type { EventEntity } from '../../entities/event.entity.js';

export interface IEventRepository {
  findById(id: string, relations?: string[]): Promise<EventEntity | null>;
  findAll(relations?: string[]): Promise<EventEntity[]>;
  create(event: Partial<EventEntity>): Promise<EventEntity>;
  update(id: string, data: Partial<EventEntity>): Promise<EventEntity | null>;
  delete(id: string): Promise<boolean>;
  search(searchTerm: string): Promise<EventEntity[]>;
}
