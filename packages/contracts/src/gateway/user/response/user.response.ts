import type { User } from '../../../user/user.js';
import type { PaginationResponse } from '../../../common/pagination.js';

export interface UserWebResponse {
  user: User;
}

export interface ListUsersWebResponse {
  users: User[];
  totalCount: number;
  pagination: PaginationResponse;
}
