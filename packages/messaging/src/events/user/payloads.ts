import type { IUserIdPayload } from '../index.js';
import type { UserRoles } from '@volontariapp/shared';

export enum UserEventMessagingType {
  USER_CREATED = 'user.created',
  USER_DELETED = 'user.deleted',
  USER_AVATAR_REPLACED = 'user.avatar_replaced',
  USER_BADGE_CREATED = 'user.badge_created',
  USER_BADGE_ICON_REPLACED = 'user.badge_icon_replaced',
  USER_BADGE_DELETED = 'user.badge_deleted',
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
  /** @deprecated Use `iconFileId`. */
  iconPath?: string;
  iconFileId?: string;
}

export interface IUserPayload {
  id: string;
  email: string;
  pseudo: string;
  /** @deprecated Use `avatarFileId`. */
  logoPath?: string;
  avatarFileId?: string;
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

/** Emitted when the avatar of a user changes. At least one of the two file ids is expected. */
export interface IUserAvatarReplacedPayload extends IUserIdPayload {
  newFileId?: string;
  oldFileId?: string;
}

export interface IBadgeCreatedPayload {
  badgeId: string;
  iconFileId?: string;
}

export interface IBadgeIconReplacedPayload {
  badgeId: string;
  newFileId?: string;
  oldFileId?: string;
}

export interface IBadgeDeletedPayload {
  badgeId: string;
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
