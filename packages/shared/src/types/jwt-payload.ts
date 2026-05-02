import type { UserRoles } from '../enums/user-roles-enum.js';

export interface JwtPayload {
  id: string;
  role: UserRoles;
  [key: string]: string | number | boolean | null | undefined | object | string[];
}
