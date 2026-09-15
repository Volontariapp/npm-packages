import type { IUserIdPayload } from '../index.js';
import type { UserRoles } from '@volontariapp/shared';

export enum UserEventMessagingType {
  USER_CREATED = 'user.created',
  USER_DELETED = 'user.deleted',
  USER_CREATION_SUCCESSFULL = 'user.creation_successfull',
  USER_CREATION_FAILED = 'user.creation_failed',
  USER_DELETION_SUCCESSFULL = 'user.deletion_successfull',
  USER_DELETION_FAILED = 'user.deletion_failed',
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

export interface IUserCreationSuccessfullPayload extends Partial<IUserIdPayload> {}

export interface IUserCreationFailedPayload extends Partial<IUserIdPayload> {
  failedEvents?: string[];
  errorReason?: string;
}

export interface IUserDeletionSuccessfullPayload extends Partial<IUserIdPayload> {}

export interface IUserDeletionFailedPayload extends Partial<IUserIdPayload> {
  failedEvents?: string[];
  errorReason?: string;
}

