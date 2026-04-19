import type { PaginationModel } from '../models/pagination.model.js';
import { PaginationVO } from '../value-objects/pagination.vo.js';

export class PaginationMapper {
  static toEntity(pagination: PaginationModel): PaginationVO {
    return new PaginationVO(pagination.page, pagination.limit);
  }

  static toModel(pagination: PaginationVO): PaginationModel {
    return {
      page: pagination.page,
      limit: pagination.limit,
    };
  }
}
