import { randomUUID } from 'node:crypto';
import type { PaginatedIds } from '../../../entities/paginated-ids.entity.js';

export class PaginatedIdsFactory {
  static build(ids: string[] = [], overrides: Partial<PaginatedIds> = {}): PaginatedIds {
    const total = ids.length;
    return {
      ids,
      pagination: {
        page: 1,
        limit: 10,
        total,
        totalPages: Math.ceil(total / 10) || 1,
      },
      ...overrides,
    };
  }

  static buildWithRandomIds(count: number): PaginatedIds {
    const ids = Array.from({ length: count }, () => randomUUID());
    return PaginatedIdsFactory.build(ids);
  }

  static buildEmpty(): PaginatedIds {
    return PaginatedIdsFactory.build([]);
  }
}
