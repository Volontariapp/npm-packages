import { describe, it, expect } from '@jest/globals';
import { PaginatedEventsVO } from '../../value-objects/paginated-events.value-object.js';
import { EventEntity } from '../../entities/event.entity.js';

describe('PaginatedEventsVO', () => {
  it('should create correctly and calculate totalPages', () => {
    const events = [new EventEntity(), new EventEntity()];
    const vo = new PaginatedEventsVO(events, 25, 1, 10);

    expect(vo.events).toBe(events);
    expect(vo.total).toBe(25);
    expect(vo.page).toBe(1);
    expect(vo.limit).toBe(10);
    expect(vo.totalPages).toBe(3);
  });

  it('should map to PaginationResponse correctly', () => {
    const vo = new PaginatedEventsVO([], 5, 2, 10);
    const response = vo.toPaginationResponse();

    expect(response).toEqual({
      total: 5,
      page: 2,
      limit: 10,
      totalPages: 1,
    });
  });
});
