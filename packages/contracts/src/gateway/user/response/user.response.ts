import type { User } from '../../../user/user.js';

export interface UserWebResponse {
  user: User;
}

export interface ListUsersWebResponse {
  users: User[];
  totalCount: number;
}
