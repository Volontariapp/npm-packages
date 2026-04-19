import { randomUUID } from 'node:crypto';
import { PaginatedIdsVO } from '../../../value-objects/paginated-ids.vo.js';
import { PaginationResultVO } from '../../../value-objects/pagination-result.vo.js';

export class PaginatedIdsFactory {
  static build(ids: string[] = [], overrides: Partial<PaginatedIdsVO> = {}): PaginatedIdsVO {
    const total = ids.length;
    const pagination = new PaginationResultVO(1, 10, total, Math.ceil(total / 10) || 1);
    const paginatedIds = new PaginatedIdsVO(ids, pagination);
    return Object.assign(paginatedIds, overrides);
  }

  static buildWithRandomIds(count: number): PaginatedIdsVO {
    const ids = Array.from({ length: count }, () => randomUUID());
    return PaginatedIdsFactory.build(ids);
  }

  static buildEmpty(): PaginatedIdsVO {
    return PaginatedIdsFactory.build([]);
  }
}
