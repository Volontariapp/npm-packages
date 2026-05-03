import type {
  PostBlockUserCommand,
  DeleteBlockUserCommand,
  AdminPostBlockUserCommand,
  AdminDeleteBlockUserCommand,
} from '../../../social/social.command.js';
import type {
  GetMyBlocksQuery,
  GetWhoBlockedMeQuery,
  AdminGetMyBlocksQuery,
  AdminGetWhoBlockedMeQuery,
} from '../../../social/social.query.js';

export interface PostBlockUserWebRequest extends PostBlockUserCommand {}
export interface DeleteBlockUserWebRequest extends DeleteBlockUserCommand {}
export interface AdminPostBlockUserWebRequest
  extends Omit<AdminPostBlockUserCommand, 'blockerId'> {}
export interface AdminDeleteBlockUserWebRequest
  extends Omit<AdminDeleteBlockUserCommand, 'blockerId'> {}

export interface GetMyBlocksWebRequest extends Partial<GetMyBlocksQuery> {}
export interface GetWhoBlockedMeWebRequest extends Partial<GetWhoBlockedMeQuery> {}
export interface AdminGetMyBlocksWebRequest extends Omit<AdminGetMyBlocksQuery, 'userId'> {}
export interface AdminGetWhoBlockedMeWebRequest extends Omit<AdminGetWhoBlockedMeQuery, 'userId'> {}
