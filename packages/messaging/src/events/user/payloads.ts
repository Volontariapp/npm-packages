import type { UserRoles } from '@volontariapp/shared';

export enum UserEventMessagingType {
  USER_CREATED = 'user.created',
  USER_DELETED = 'user.deleted',
}

export interface IBadgePayload {
  id: string;
  name: string;
  slug: string;
  description: string;
  iconPath?: string;
}

export interface IUserPayload {
  id: string;
  email: string;
  pseudo: string;
  logoPath?: string;
  rna?: string;
  bio?: string;
  role: UserRoles;
  totalImpactScore: number;
  badges: IBadgePayload[];
  passwordHash?: string;
}

export interface IUserCreatedPayload {
  id: string;
  role: UserRoles;
}

export interface IUserDeleledPayload {
  id: string;
  role: UserRoles;
}
