import type { PaginationResultVO } from './pagination-result.vo.js';

export class PaginatedIdsVO {
  constructor(
    public readonly ids: string[],
    public readonly pagination: PaginationResultVO,
  ) {}
}
