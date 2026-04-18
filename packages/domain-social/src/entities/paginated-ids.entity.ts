import type { PaginationResponse } from '@volontariapp/contracts';

export interface PaginatedIds {
  ids: string[];
  pagination: PaginationResponse;
}
