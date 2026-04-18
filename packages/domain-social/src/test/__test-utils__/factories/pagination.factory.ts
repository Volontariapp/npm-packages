import { PaginationVO } from '../../../value-objects/pagination.vo.js';

export class PaginationFactory {
  static build(page = 1, limit = 10): PaginationVO {
    return new PaginationVO(page, limit);
  }
}
