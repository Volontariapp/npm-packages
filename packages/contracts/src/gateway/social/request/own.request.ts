import type {
  PostUserOwnCommand,
  DeleteUserOwnCommand,
  AdminPostUserOwnCommand,
  AdminDeleteUserOwnCommand,
} from '../../../social/social.command.js';

export interface PostUserOwnWebRequest extends PostUserOwnCommand {}
export interface DeleteUserOwnWebRequest extends DeleteUserOwnCommand {}
export interface AdminPostUserOwnWebRequest extends Omit<AdminPostUserOwnCommand, 'userId'> {}
export interface AdminDeleteUserOwnWebRequest extends Omit<AdminDeleteUserOwnCommand, 'userId'> {}
