import type {
  PostLikePostCommand,
  DeleteLikePostCommand,
  AdminPostLikePostCommand,
  AdminDeleteLikePostCommand,
} from '../../../social/social.command.js';
import type {
  GetUserLikesQuery,
  GetPostLikersQuery,
  AdminGetUserLikesQuery,
} from '../../../social/social.query.js';

export interface PostLikePostWebRequest extends PostLikePostCommand {}
export interface DeleteLikePostWebRequest extends DeleteLikePostCommand {}
export interface AdminPostLikePostWebRequest extends Omit<AdminPostLikePostCommand, 'userId'> {}
export interface AdminDeleteLikePostWebRequest extends Omit<AdminDeleteLikePostCommand, 'userId'> {}

export interface GetUserLikesWebRequest extends Partial<GetUserLikesQuery> {}
export interface GetPostLikersWebRequest extends Partial<GetPostLikersQuery> {}
export interface AdminGetUserLikesWebRequest extends Omit<AdminGetUserLikesQuery, 'userId'> {}
