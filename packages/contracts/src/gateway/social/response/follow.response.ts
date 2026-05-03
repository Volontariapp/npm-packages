import type {
  PostFollowUserResponse,
  DeleteFollowUserResponse,
  GetMyFollowsResponse,
  GetMyFollowersResponse,
  AdminPostFollowUserResponse,
  AdminDeleteFollowUserResponse,
  AdminGetMyFollowsResponse,
  AdminGetMyFollowersResponse,
} from '../../../social/social.responses.js';

export interface PostFollowUserWebResponse extends PostFollowUserResponse {}
export interface DeleteFollowUserWebResponse extends DeleteFollowUserResponse {}
export interface GetMyFollowsWebResponse extends GetMyFollowsResponse {}
export interface GetMyFollowersWebResponse extends GetMyFollowersResponse {}

export interface AdminPostFollowUserWebResponse extends AdminPostFollowUserResponse {}
export interface AdminDeleteFollowUserWebResponse extends AdminDeleteFollowUserResponse {}
export interface AdminGetMyFollowsWebResponse extends AdminGetMyFollowsResponse {}
export interface AdminGetMyFollowersWebResponse extends AdminGetMyFollowersResponse {}
