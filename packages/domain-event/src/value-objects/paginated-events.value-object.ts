import type { EventEntity } from '../entities/event.entity.js';
import type { PaginationResponse } from '@volontariapp/contracts';

export class PaginatedEventsVO {
  constructor(
    public readonly events: EventEntity[],
    public readonly total: number,
    public readonly page: number,
    public readonly limit: number,
  ) {}

  get totalPages(): number {
    return Math.ceil(this.total / this.limit);
  }

  toPaginationResponse(): PaginationResponse {
    return {
      total: this.total,
      page: this.page,
      limit: this.limit,
      totalPages: this.totalPages,
    };
  }
}
