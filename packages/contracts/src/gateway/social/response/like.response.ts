import type {
  PostLikePostResponse,
  DeleteLikePostResponse,
  GetUserLikesResponse,
  GetPostLikersResponse,
  AdminPostLikePostResponse,
  AdminDeleteLikePostResponse,
  AdminGetUserLikesResponse,
} from '../../../social/social.responses.js';

export interface PostLikePostWebResponse extends PostLikePostResponse {}
export interface DeleteLikePostWebResponse extends DeleteLikePostResponse {}
export interface GetUserLikesWebResponse extends GetUserLikesResponse {}
export interface GetPostLikersWebResponse extends GetPostLikersResponse {}

export interface AdminPostLikePostWebResponse extends AdminPostLikePostResponse {}
export interface AdminDeleteLikePostWebResponse extends AdminDeleteLikePostResponse {}
export interface AdminGetUserLikesWebResponse extends AdminGetUserLikesResponse {}
