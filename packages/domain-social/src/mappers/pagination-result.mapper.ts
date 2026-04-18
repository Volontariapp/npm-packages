import type { PaginationResultModel } from '../models/pagination-result.model.js';
import { PaginationResultVO } from '../value-objects/pagination-result.vo.js';

export class PaginationResultMapper {
  static toEntity(paginationResult: PaginationResultModel): PaginationResultVO {
    return new PaginationResultVO(
      paginationResult.page,
      paginationResult.limit,
      paginationResult.total,
      paginationResult.totalPages,
    );
  }

  static toModel(paginationResult: PaginationResultVO): PaginationResultModel {
    return {
      page: paginationResult.page,
      limit: paginationResult.limit,
      total: paginationResult.total,
      totalPages: paginationResult.totalPages,
    };
  }
}
