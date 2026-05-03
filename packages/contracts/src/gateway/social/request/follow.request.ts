import type {
  PostFollowUserCommand,
  DeleteFollowUserCommand,
  AdminPostFollowUserCommand,
  AdminDeleteFollowUserCommand,
} from '../../../social/social.command.js';
import type {
  GetMyFollowsQuery,
  GetMyFollowersQuery,
  AdminGetMyFollowsQuery,
  AdminGetMyFollowersQuery,
} from '../../../social/social.query.js';

export interface PostFollowUserWebRequest extends PostFollowUserCommand {}
export interface DeleteFollowUserWebRequest extends DeleteFollowUserCommand {}
export interface AdminPostFollowUserWebRequest
  extends Omit<AdminPostFollowUserCommand, 'followerId'> {}
export interface AdminDeleteFollowUserWebRequest
  extends Omit<AdminDeleteFollowUserCommand, 'followerId'> {}

export interface GetMyFollowsWebRequest extends Partial<GetMyFollowsQuery> {}
export interface GetMyFollowersWebRequest extends Partial<GetMyFollowersQuery> {}
export interface AdminGetMyFollowsWebRequest extends Omit<AdminGetMyFollowsQuery, 'userId'> {}
export interface AdminGetMyFollowersWebRequest extends Omit<AdminGetMyFollowersQuery, 'userId'> {}
